// ======================================================
// src/models/Order.js
// ======================================================
const { pool } = require('../config/database');

const Order = {
    // ==================================================
    // CRIAR PEDIDO A PARTIR DE ITENS
    // ==================================================
    async create({ userId, items, shippingAddress, paymentMethod, subtotal, shippingCost, discount, total, notes }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const orderResult = await client.query(`
                INSERT INTO orders (
                    user_id, status, subtotal, shipping_cost, discount, total,
                    payment_method, payment_status,
                    shipping_cep, shipping_street, shipping_number,
                    shipping_complement, shipping_neighborhood, shipping_city, shipping_state,
                    notes
                ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            `, [
                userId,
                subtotal,
                shippingCost,
                discount,
                total,
                paymentMethod,
                shippingAddress.cep || null,
                shippingAddress.street || null,
                shippingAddress.number || null,
                shippingAddress.complement || null,
                shippingAddress.neighborhood || null,
                shippingAddress.city || null,
                shippingAddress.state || null,
                notes || null,
            ]);

            const order = orderResult.rows[0];

            for (const item of items) {
                await client.query(`
                    INSERT INTO order_items (
                        order_id, product_id, product_name, product_slug, product_image,
                        quantity, unit_price, subtotal
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    order.id,
                    item.product_id,
                    item.name,
                    item.slug,
                    item.image_url,
                    item.quantity,
                    item.unit_price,
                    item.subtotal,
                ]);

                const stockResult = await client.query(`
                    UPDATE products
                    SET stock_quantity = stock_quantity - $1,
                        stock_status = CASE
                            WHEN stock_quantity - $1 <= 0 THEN 'out_of_stock'
                            ELSE 'in_stock'
                        END
                    WHERE id = $2 AND stock_quantity >= $1
                    RETURNING stock_quantity
                `, [item.quantity, item.product_id]);

                if (stockResult.rows.length === 0) {
                    const err = new Error(`Estoque insuficiente para "${item.name}"`);
                    err.status = 400;
                    throw err;
                }

                await client.query(`
                    INSERT INTO inventory_movements (
                        product_id, movement_type, quantity,
                        previous_quantity, new_quantity,
                        reason, reference_type, reference_id
                    ) VALUES ($1, 'out', $2, $3, $4, 'Venda', 'order', $5)
                `, [
                    item.product_id,
                    item.quantity,
                    stockResult.rows[0].stock_quantity + item.quantity,
                    stockResult.rows[0].stock_quantity,
                    order.id,
                ]);

                await client.query(`
                    UPDATE inventory
                    SET quantity = GREATEST(0, quantity - $1)
                    WHERE product_id = $2
                `, [item.quantity, item.product_id]);

                await client.query(`
                    UPDATE products
                    SET sales_count = sales_count + $1
                    WHERE id = $2
                `, [item.quantity, item.product_id]);
            }

            await client.query(`
                DELETE FROM cart_items
                WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)
            `, [userId]);

            await client.query('COMMIT');
            return order;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ==================================================
    // BUSCAR PEDIDO POR ID (com itens + pagamentos)
    // ==================================================
    async findById(id, userId = null) {
        const query = `
            SELECT
                o.*,
                u.full_name as user_name,
                u.email as user_email,
                (SELECT json_agg(json_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'name', oi.product_name,
                    'slug', oi.product_slug,
                    'image_url', oi.product_image,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'subtotal', oi.subtotal
                ) ORDER BY oi.id)
                FROM order_items oi WHERE oi.order_id = o.id) as items,
                (SELECT json_agg(json_build_object(
                    'id', p.id,
                    'method', p.method,
                    'status', p.status,
                    'amount', p.amount,
                    'transaction_id', p.transaction_id,
                    'paid_at', p.paid_at,
                    'created_at', p.created_at
                ) ORDER BY p.created_at DESC)
                FROM payments p WHERE p.order_id = o.id) as payments
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE o.id = $1 ${userId ? 'AND o.user_id = $2' : ''}
        `;

        const params = userId ? [id, userId] : [id];
        const result = await pool.query(query, params);
        return result.rows[0] || null;
    },

    // ==================================================
    // LISTAR PEDIDOS DO USUÁRIO (cliente)
    // ==================================================
    async findByUser(userId, { limit = 20, offset = 0 } = {}) {
        const query = `
            SELECT
                o.id,
                o.status,
                o.total,
                o.payment_method,
                o.payment_status,
                o.created_at,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count,
                (SELECT json_build_object(
                    'url', oi.product_image,
                    'name', oi.product_name
                )
                FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.id LIMIT 1) as first_item
            FROM orders o
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [userId, limit, offset]);
        return result.rows;
    },

    async countByUser(userId) {
        const result = await pool.query(
            'SELECT COUNT(*)::int as total FROM orders WHERE user_id = $1',
            [userId]
        );
        return result.rows[0].total;
    },

    // ==================================================
    // HELPER — Constrói WHERE da listagem admin
    // (usado por findAll E countAll para garantir consistência)
    // ==================================================
    _buildAdminFilters({ status, q, from, to } = {}) {
        const conditions = ['1=1'];
        const params = [];
        let p = 1;

        if (status && ['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            conditions.push(`o.status = $${p++}`);
            params.push(status);
        }

        if (q && q.trim()) {
            conditions.push(`(
                CAST(o.id AS TEXT) = $${p}
                OR u.full_name ILIKE $${p + 1}
                OR u.email ILIKE $${p + 1}
            )`);
            params.push(q.trim(), `%${q.trim()}%`);
            p += 2;
        }

        if (from) {
            conditions.push(`o.created_at >= $${p++}`);
            params.push(from);
        }
        if (to) {
            conditions.push(`o.created_at <= $${p++}`);
            params.push(to);
        }

        return {
            where: conditions.join(' AND '),
            params,
            paramCounter: p,
        };
    },

    // ==================================================
    // LISTAR PEDIDOS (admin, com filtros + ordenação)
    // ==================================================
    // ==================================================
    // LISTAR PEDIDOS (admin, com filtros + ordenação)
    // ==================================================
    async findAll({ status, q, from, to, sort = 'created_at', order = 'desc', limit = 20, offset = 0 } = {}) {
        const { where, params, paramCounter } = this._buildAdminFilters({ status, q, from, to });

        const sortMap = {
            id: 'o.id',
            created_at: 'o.created_at',
            user_name: 'u.full_name',
            status: 'o.status',
            total: 'o.total',
            payment_method: 'o.payment_method',
            // 🆕 ordenação pela coluna de envio derivada
            shipping_status: `
                CASE o.status
                    WHEN 'paid'      THEN 1
                    WHEN 'shipped'   THEN 2
                    WHEN 'delivered' THEN 3
                    WHEN 'cancelled' THEN 4
                    ELSE 0
                END
            `,
        };
        const sortField = sortMap[sort] || 'o.created_at';
        const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const query = `
            SELECT
                o.id,
                o.user_id,
                o.status,
                o.total,
                o.payment_method,
                o.payment_status,
                o.shipping_city,
                o.shipping_state,
                o.created_at,
                o.updated_at,
                u.full_name as user_name,
                u.email as user_email,
                (SELECT COUNT(*)::int FROM order_items WHERE order_id = o.id) as items_count,
                CASE o.status
                    WHEN 'paid'      THEN 'awaiting_shipment'
                    WHEN 'shipped'   THEN 'in_transit'
                    WHEN 'delivered' THEN 'delivered'
                    WHEN 'cancelled' THEN 'cancelled'
                    ELSE 'not_applicable'
                END AS shipping_status
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE ${where}
            ORDER BY ${sortField} ${sortOrder}
            LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
        `;

        const queryParams = [...params, limit, offset];
        const result = await pool.query(query, queryParams);
        return result.rows;
    },

    // ==================================================
    // CONTAR PEDIDOS (admin, com os mesmos filtros)
    // ==================================================
    async countAll({ status, q, from, to } = {}) {
        const { where, params } = this._buildAdminFilters({ status, q, from, to });

        const query = `
            SELECT COUNT(*)::int as total
            FROM orders o
            LEFT JOIN users u ON u.id = o.user_id
            WHERE ${where}
        `;
        const result = await pool.query(query, params);
        return result.rows[0].total;
    },

    // ==================================================
    // ATUALIZAR STATUS
    // ==================================================
    // ==================================================
    // ATUALIZAR STATUS
    // ==================================================
    async updateStatus(id, status, reason = null) {
        // Se for cancelamento, usa o método dedicado (com estorno de estoque)
        // Isso é só um guarda-corpo — o controller já roteia, mas reforçamos
        if (status === 'cancelled') {
            return this.cancel(id, reason);
        }

        const query = `
            UPDATE orders
            SET status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [status, id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // MARCAR COMO PAGO
    // ==================================================
    async markAsPaid(id) {
        const query = `
            UPDATE orders
            SET status = 'paid',
                payment_status = 'paid',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // CANCELAR PEDIDO (com estorno de estoque)
    // ==================================================
    async cancel(id, reason = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const orderResult = await client.query(
                'SELECT * FROM orders WHERE id = $1',
                [id]
            );

            if (orderResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            const order = orderResult.rows[0];

            if (order.status === 'cancelled') {
                await client.query('ROLLBACK');
                return order;
            }

            const itemsResult = await client.query(
                'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
                [id]
            );

            for (const item of itemsResult.rows) {
                if (!item.product_id) continue;

                await client.query(`
                    UPDATE products
                    SET stock_quantity = stock_quantity + $1,
                        stock_status = 'in_stock'
                    WHERE id = $2
                `, [item.quantity, item.product_id]);

                await client.query(`
                    UPDATE inventory
                    SET quantity = quantity + $1
                    WHERE product_id = $2
                `, [item.quantity, item.product_id]);

                // Registra movimentação de devolução
                await client.query(`
                    INSERT INTO inventory_movements (
                        product_id, movement_type, quantity,
                        previous_quantity, new_quantity,
                        reason, reference_type, reference_id
                    )
                    SELECT
                        $1, 'return', $2,
                        (SELECT stock_quantity FROM products WHERE id = $1) - $2,
                        (SELECT stock_quantity FROM products WHERE id = $1),
                        'Cancelamento de pedido', 'order', $3
                `, [item.product_id, item.quantity, id]);
            }

            const updateResult = await client.query(`
                UPDATE orders
                SET status = 'cancelled',
                    payment_status = CASE
                        WHEN payment_status = 'paid' THEN 'refunded'
                        ELSE payment_status
                    END,
                    cancelled_at = CURRENT_TIMESTAMP,
                    cancel_reason = $1
                WHERE id = $2
                RETURNING *
            `, [reason, id]);

            await client.query('COMMIT');
            return updateResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ==================================================
    // ESTATÍSTICAS (com filtros de período opcionais)
    // ==================================================
    async getStats({ from = null, to = null } = {}) {
        const conditions = ['1=1'];
        const params = [];
        let p = 1;

        if (from) {
            conditions.push(`created_at >= $${p++}`);
            params.push(from);
        }
        if (to) {
            conditions.push(`created_at <= $${p++}`);
            params.push(to);
        }

        const where = conditions.join(' AND ');

        const query = `
            SELECT
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
                COUNT(*) FILTER (WHERE status = 'paid')::int as paid,
                COUNT(*) FILTER (WHERE status = 'shipped')::int as shipped,
                COUNT(*) FILTER (WHERE status = 'delivered')::int as delivered,
                COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancelled,
                COALESCE(SUM(total) FILTER (WHERE status != 'cancelled'), 0)::numeric(12,2) as revenue
            FROM orders
            WHERE ${where}
        `;

        const result = await pool.query(query, params);
        return result.rows[0];
    },
};

module.exports = Order;