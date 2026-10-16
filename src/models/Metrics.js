// ======================================================
// src/models/Metrics.js
// Queries agregadas para o dashboard de Métricas
// ======================================================
const { pool } = require('../config/database');

// ======================================================
// HELPERS
// ======================================================

/**
 * Converte "7d", "30d", "90d", "12m" em intervalo SQL.
 */
function parsePeriod(period) {
    const map = {
        '7d':  { interval: '7 days',    label: 'Últimos 7 dias' },
        '30d': { interval: '30 days',   label: 'Últimos 30 dias' },
        '90d': { interval: '90 days',   label: 'Últimos 90 dias' },
        '12m': { interval: '12 months', label: 'Últimos 12 meses' },
    };
    return map[period] || map['30d'];
}

/**
 * Converte "30d"/"12m" em número de dias, para granularidade.
 */
function periodToDays(period) {
    const map = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
    return map[period] || 30;
}

/**
 * Define a granularidade do agrupamento temporal.
 */
function pickTrunc(period) {
    if (period === '12m') return 'month';
    if (period === '90d') return 'week';
    return 'day';
}

// ======================================================
// MODEL
// ======================================================
const Metrics = {
    // ==================================================
    // OVERVIEW — KPIs do topo (com deltas vs período anterior)
    // ==================================================
    async getOverview(period = '30d') {
        const { interval } = parsePeriod(period);

        const currentQuery = `
            SELECT
                COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0)::numeric(12,2) AS revenue,
                COUNT(*) FILTER (WHERE status != 'cancelled')::int AS orders,
                COALESCE(AVG(total) FILTER (WHERE status != 'cancelled'), 0)::numeric(12,2) AS ticket_avg
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
        `;

        const previousQuery = `
            SELECT
                COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0)::numeric(12,2) AS revenue,
                COUNT(*) FILTER (WHERE status != 'cancelled')::int AS orders,
                COALESCE(AVG(total) FILTER (WHERE status != 'cancelled'), 0)::numeric(12,2) AS ticket_avg
            FROM orders
            WHERE created_at >= NOW() - (INTERVAL '${interval}' * 2)
              AND created_at <  NOW() - INTERVAL '${interval}'
        `;

        const customersCurrentQuery = `
            SELECT COUNT(*)::int AS customers
            FROM users
            WHERE role = 'customer'
              AND created_at >= NOW() - INTERVAL '${interval}'
        `;

        const customersPreviousQuery = `
            SELECT COUNT(*)::int AS customers
            FROM users
            WHERE role = 'customer'
              AND created_at >= NOW() - (INTERVAL '${interval}' * 2)
              AND created_at <  NOW() - INTERVAL '${interval}'
        `;

        const [current, previous, custCurrent, custPrevious] = await Promise.all([
            pool.query(currentQuery),
            pool.query(previousQuery),
            pool.query(customersCurrentQuery),
            pool.query(customersPreviousQuery),
        ]);

        const c = current.rows[0];
        const p = previous.rows[0];
        const cc = custCurrent.rows[0];
        const cp = custPrevious.rows[0];

        const pct = (curr, prev) => {
            const cur = parseFloat(curr) || 0;
            const pre = parseFloat(prev) || 0;
            if (pre === 0) return cur > 0 ? 100 : 0;
            return Math.round(((cur - pre) / pre) * 1000) / 10;
        };

        return {
            period,
            label: parsePeriod(period).label,
            revenue: {
                value: parseFloat(c.revenue),
                delta_pct: pct(c.revenue, p.revenue),
            },
            orders: {
                value: c.orders,
                delta_pct: pct(c.orders, p.orders),
            },
            ticket_avg: {
                value: parseFloat(c.ticket_avg),
                delta_pct: pct(c.ticket_avg, p.ticket_avg),
            },
            customers: {
                value: cc.customers,
                delta_pct: pct(cc.customers, cp.customers),
            },
        };
    },

    // ==================================================
    // RECEITA AO LONGO DO TEMPO
    // ==================================================
    async getRevenueTimeseries(period = '30d') {
        const { interval } = parsePeriod(period);
        const trunc = pickTrunc(period);

        const query = `
            SELECT
                DATE_TRUNC('${trunc}', created_at)::date AS bucket,
                COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0)::numeric(12,2) AS revenue,
                COUNT(*) FILTER (WHERE status != 'cancelled')::int AS orders
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY bucket
            ORDER BY bucket ASC
        `;

        const result = await pool.query(query);
        return result.rows.map((r) => ({
            date: r.bucket,
            revenue: parseFloat(r.revenue),
            orders: r.orders,
        }));
    },

    // ==================================================
    // PEDIDOS POR STATUS
    // ==================================================
    async getOrdersByStatus(period = '30d') {
        const { interval } = parsePeriod(period);

        const query = `
            SELECT
                status,
                COUNT(*)::int AS count,
                COALESCE(SUM(total), 0)::numeric(12,2) AS total
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY status
            ORDER BY count DESC
        `;

        const result = await pool.query(query);
        return result.rows.map((r) => ({
            status: r.status,
            count: r.count,
            total: parseFloat(r.total),
        }));
    },

    // ==================================================
    // FORMAS DE PAGAMENTO
    // ==================================================
    async getPaymentMethods(period = '30d') {
        const { interval } = parsePeriod(period);

        const query = `
            SELECT
                method,
                COUNT(*)::int AS count,
                COALESCE(SUM(amount), 0)::numeric(12,2) AS total
            FROM payments
            WHERE created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY method
            ORDER BY count DESC
        `;

        const result = await pool.query(query);
        return result.rows.map((r) => ({
            method: r.method,
            count: r.count,
            total: parseFloat(r.total),
        }));
    },

    // ==================================================
    // TOP CATEGORIAS POR RECEITA
    // ==================================================
    async getTopCategories(period = '30d', limit = 5) {
        const { interval } = parsePeriod(period);

        const query = `
            SELECT
                c.id,
                c.name,
                COALESCE(SUM(oi.subtotal), 0)::numeric(12,2) AS revenue,
                COALESCE(SUM(oi.quantity), 0)::int AS units_sold
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            INNER JOIN products p ON p.id = oi.product_id
            INNER JOIN categories c ON c.id = p.category_id
            WHERE o.created_at >= NOW() - INTERVAL '${interval}'
              AND o.status != 'cancelled'
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows.map((r) => ({
            category_id: r.id,
            name: r.name,
            revenue: parseFloat(r.revenue),
            units_sold: r.units_sold,
        }));
    },

    // ==================================================
    // MOVIMENTAÇÕES DE ESTOQUE
    // ==================================================
    async getStockMovements(period = '30d') {
        const { interval } = parsePeriod(period);
        const trunc = pickTrunc(period);

        const query = `
            SELECT
                DATE_TRUNC('${trunc}', created_at)::date AS bucket,
                COALESCE(SUM(CASE WHEN movement_type = 'in'  THEN quantity ELSE 0 END), 0)::int AS in_qty,
                COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0)::int AS out_qty
            FROM inventory_movements
            WHERE created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY bucket
            ORDER BY bucket ASC
        `;

        const result = await pool.query(query);
        return result.rows.map((r) => ({
            date: r.bucket,
            in_qty: r.in_qty,
            out_qty: r.out_qty,
        }));
    },

    // ==================================================
    // NOVOS CLIENTES POR PERÍODO
    // ==================================================
    async getNewCustomers(period = '30d') {
        const { interval } = parsePeriod(period);
        const trunc = pickTrunc(period);

        const query = `
            SELECT
                DATE_TRUNC('${trunc}', created_at)::date AS bucket,
                COUNT(*)::int AS count
            FROM users
            WHERE role = 'customer'
              AND created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY bucket
            ORDER BY bucket ASC
        `;

        const result = await pool.query(query);
        return result.rows.map((r) => ({
            date: r.bucket,
            count: r.count,
        }));
    },

    // ==================================================
    // DISTRIBUIÇÃO DE PREÇOS
    // ==================================================
    async getPriceDistribution() {
        const query = `
            SELECT
                CASE
                    WHEN price < 50   THEN '0-50'
                    WHEN price < 100  THEN '50-100'
                    WHEN price < 200  THEN '100-200'
                    WHEN price < 500  THEN '200-500'
                    WHEN price < 1000 THEN '500-1000'
                    ELSE '1000+'
                END AS range_label,
                COUNT(*)::int AS count
            FROM products
            WHERE deleted_at IS NULL
            GROUP BY range_label
        `;

        const result = await pool.query(query);

        const order = ['0-50', '50-100', '100-200', '200-500', '500-1000', '1000+'];
        const map = Object.fromEntries(result.rows.map((r) => [r.range_label, r.count]));
        return order.map((label) => ({
            range: label,
            count: map[label] || 0,
        }));
    },

    // ==================================================
    // TOP 10 CLIENTES POR RECEITA
    // ==================================================
    async getTopCustomers(period = '30d', limit = 10) {
        const { interval } = parsePeriod(period);

        const query = `
            SELECT
                u.id,
                u.full_name,
                u.email,
                COUNT(o.id)::int AS orders_count,
                COALESCE(SUM(o.total), 0)::numeric(12,2) AS revenue
            FROM users u
            INNER JOIN orders o ON o.user_id = u.id
            WHERE o.created_at >= NOW() - INTERVAL '${interval}'
              AND o.status != 'cancelled'
            GROUP BY u.id, u.full_name, u.email
            ORDER BY revenue DESC
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        return result.rows.map((r) => ({
            user_id: r.id,
            full_name: r.full_name,
            email: r.email,
            orders_count: r.orders_count,
            revenue: parseFloat(r.revenue),
        }));
    },

    // ==================================================
    // DETALHE — Receita (lista de pedidos do período)
    // ==================================================
    async getRevenueDetail({ period = '30d', page = 1, limit = 20 }) {
        const { interval } = parsePeriod(period);
        const offset = (page - 1) * limit;

        const itemsQuery = `
            SELECT
                o.id,
                o.created_at,
                o.status,
                o.total,
                o.payment_method,
                u.full_name AS user_name,
                u.email AS user_email
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE o.created_at >= NOW() - INTERVAL '${interval}'
              AND o.status != 'cancelled'
            ORDER BY o.total DESC, o.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `
            SELECT
                COUNT(*)::int AS total,
                COALESCE(SUM(total), 0)::numeric(12,2) AS total_revenue,
                COALESCE(AVG(total), 0)::numeric(12,2) AS avg_ticket
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
              AND status != 'cancelled'
        `;

        const [itemsResult, countResult] = await Promise.all([
            pool.query(itemsQuery, [limit, offset]),
            pool.query(countQuery),
        ]);

        const stats = countResult.rows[0];

        return {
            type: 'revenue',
            period,
            summary: {
                total: stats.total,
                total_revenue: parseFloat(stats.total_revenue),
                avg_ticket: parseFloat(stats.avg_ticket),
            },
            items: itemsResult.rows.map((r) => ({
                id: r.id,
                created_at: r.created_at,
                status: r.status,
                total: parseFloat(r.total),
                payment_method: r.payment_method,
                user_name: r.user_name,
                user_email: r.user_email,
            })),
            pagination: {
                page,
                limit,
                total: stats.total,
                pages: Math.ceil(stats.total / limit),
            },
        };
    },

    // ==================================================
    // DETALHE — Novos clientes (lista de usuários do período)
    // ==================================================
    async getNewCustomersDetail({ period = '30d', page = 1, limit = 20, only_buyers = false }) {
        const { interval } = parsePeriod(period);
        const offset = (page - 1) * limit;

        const havingClause = only_buyers ? 'HAVING COUNT(o.id) > 0' : '';

        const itemsQuery = `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.created_at AS registered_at,
                COUNT(o.id)::int AS orders_count,
                COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled'), 0)::numeric(12,2) AS total_spent
            FROM users u
            LEFT JOIN orders o ON o.user_id = u.id
            WHERE u.role = 'customer'
              AND u.created_at >= NOW() - INTERVAL '${interval}'
            GROUP BY u.id, u.full_name, u.email, u.created_at
            ${havingClause}
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM (
                SELECT u.id
                FROM users u
                LEFT JOIN orders o ON o.user_id = u.id
                WHERE u.role = 'customer'
                  AND u.created_at >= NOW() - INTERVAL '${interval}'
                GROUP BY u.id
                ${havingClause}
            ) sub
        `;

        const buyersQuery = `
            SELECT COUNT(DISTINCT u.id)::int AS total
            FROM users u
            INNER JOIN orders o ON o.user_id = u.id
            WHERE u.role = 'customer'
              AND u.created_at >= NOW() - INTERVAL '${interval}'
              AND o.status != 'cancelled'
        `;

        const [itemsResult, countResult, buyersResult] = await Promise.all([
            pool.query(itemsQuery, [limit, offset]),
            pool.query(countQuery),
            pool.query(buyersQuery),
        ]);

        return {
            type: 'customers',
            period,
            summary: {
                total: countResult.rows[0].total,
                buyers: buyersResult.rows[0].total,
            },
            items: itemsResult.rows.map((r) => ({
                id: r.id,
                full_name: r.full_name,
                email: r.email,
                registered_at: r.registered_at,
                orders_count: r.orders_count,
                total_spent: parseFloat(r.total_spent),
            })),
            pagination: {
                page,
                limit,
                total: countResult.rows[0].total,
                pages: Math.ceil(countResult.rows[0].total / limit),
            },
        };
    },

        // ==================================================
    // DETALHE — Pedidos (lista completa, sem filtro de status)
    // ==================================================
    async getOrdersDetail({ period = '30d', page = 1, limit = 20, status = null }) {
        const { interval } = parsePeriod(period);
        const offset = (page - 1) * limit;

        // Condição de status opcional
        const statusCondition = status ? `AND o.status = $3` : '';
        const params = status ? [limit, offset, status] : [limit, offset];

        const itemsQuery = `
            SELECT
                o.id,
                o.created_at,
                o.status,
                o.total,
                o.payment_method,
                o.payment_status,
                u.full_name AS user_name,
                u.email AS user_email
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE o.created_at >= NOW() - INTERVAL '${interval}'
              ${statusCondition}
            ORDER BY o.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const countSql = `
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
                COUNT(*) FILTER (WHERE status = 'paid')::int      AS paid,
                COUNT(*) FILTER (WHERE status = 'shipped')::int   AS shipped,
                COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
                COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
        `;

        const [itemsResult, countResult] = await Promise.all([
            pool.query(itemsQuery, params),
            pool.query(countSql),
        ]);

        const stats = countResult.rows[0];

        return {
            type: 'orders',
            period,
            summary: {
                total: stats.total,
                pending: stats.pending,
                paid: stats.paid,
                shipped: stats.shipped,
                delivered: stats.delivered,
                cancelled: stats.cancelled,
            },
            items: itemsResult.rows.map((r) => ({
                id: r.id,
                created_at: r.created_at,
                status: r.status,
                total: parseFloat(r.total),
                payment_method: r.payment_method,
                payment_status: r.payment_status,
                user_name: r.user_name,
                user_email: r.user_email,
            })),
            pagination: {
                page,
                limit,
                total: stats.total,
                pages: Math.ceil(stats.total / limit),
            },
        };
    },

    // ==================================================
    // DETALHE — Ticket Médio (distribuição + top pedidos)
    // ==================================================
    async getTicketDetail({ period = '30d' }) {
        const { interval } = parsePeriod(period);

        // Stats principais
        const statsQuery = `
            SELECT
                COUNT(*)::int AS total_orders,
                COALESCE(AVG(total), 0)::numeric(12,2) AS avg_ticket,
                COALESCE(MIN(total), 0)::numeric(12,2) AS min_ticket,
                COALESCE(MAX(total), 0)::numeric(12,2) AS max_ticket,
                COALESCE(SUM(total), 0)::numeric(12,2) AS total_revenue
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
              AND status != 'cancelled'
        `;

        // Mediana (usando percentile_cont)
        const medianQuery = `
            SELECT
                COALESCE(
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total),
                    0
                )::numeric(12,2) AS median_ticket
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
              AND status != 'cancelled'
        `;

        // Distribuição por faixa
        const distributionQuery = `
            SELECT
                CASE
                    WHEN total < 100  THEN '0-100'
                    WHEN total < 200  THEN '100-200'
                    WHEN total < 300  THEN '200-300'
                    WHEN total < 500  THEN '300-500'
                    WHEN total < 1000 THEN '500-1000'
                    ELSE '1000+'
                END AS range_label,
                COUNT(*)::int AS count,
                COALESCE(SUM(total), 0)::numeric(12,2) AS revenue
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '${interval}'
              AND status != 'cancelled'
            GROUP BY range_label
        `;

        // Top 5 pedidos acima da média
        const topAboveQuery = `
            WITH avg_calc AS (
                SELECT AVG(total) AS avg_ticket
                FROM orders
                WHERE created_at >= NOW() - INTERVAL '${interval}'
                  AND status != 'cancelled'
            )
            SELECT
                o.id,
                o.created_at,
                o.status,
                o.total,
                u.full_name AS user_name
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            CROSS JOIN avg_calc
            WHERE o.created_at >= NOW() - INTERVAL '${interval}'
              AND o.status != 'cancelled'
              AND o.total > avg_calc.avg_ticket
            ORDER BY o.total DESC
            LIMIT 5
        `;

        const [stats, median, distribution, topAbove] = await Promise.all([
            pool.query(statsQuery),
            pool.query(medianQuery),
            pool.query(distributionQuery),
            pool.query(topAboveQuery),
        ]);

        // Ordena as faixas
        const order = ['0-100', '100-200', '200-300', '300-500', '500-1000', '1000+'];
        const distMap = Object.fromEntries(distribution.rows.map((r) => [r.range_label, r]));
        const distributionArr = order.map((label) => ({
            range: label,
            count: distMap[label]?.count || 0,
            revenue: parseFloat(distMap[label]?.revenue || 0),
        }));

        const s = stats.rows[0];
        return {
            type: 'ticket',
            period,
            summary: {
                total_orders: s.total_orders,
                avg_ticket: parseFloat(s.avg_ticket),
                median_ticket: parseFloat(median.rows[0].median_ticket),
                min_ticket: parseFloat(s.min_ticket),
                max_ticket: parseFloat(s.max_ticket),
                total_revenue: parseFloat(s.total_revenue),
            },
            distribution: distributionArr,
            top_above_avg: topAbove.rows.map((r) => ({
                id: r.id,
                created_at: r.created_at,
                status: r.status,
                total: parseFloat(r.total),
                user_name: r.user_name,
            })),
        };
    },

    // ==================================================
    // ALL-IN-ONE — retorna tudo em uma única chamada
    // ==================================================
    async getAll(period = '30d') {
        const [
            overview,
            revenue_timeseries,
            orders_by_status,
            payment_methods,
            top_categories,
            stock_movements,
            new_customers,
            price_distribution,
            top_customers,
        ] = await Promise.all([
            this.getOverview(period),
            this.getRevenueTimeseries(period),
            this.getOrdersByStatus(period),
            this.getPaymentMethods(period),
            this.getTopCategories(period, 5),
            this.getStockMovements(period),
            this.getNewCustomers(period),
            this.getPriceDistribution(),
            this.getTopCustomers(period, 10),
        ]);

        return {
            period,
            generated_at: new Date().toISOString(),
            overview,
            revenue_timeseries,
            orders_by_status,
            payment_methods,
            top_categories,
            stock_movements,
            new_customers,
            price_distribution,
            top_customers,
        };
    },
};

module.exports = Metrics;