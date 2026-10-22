// ======================================================
// src/models/Promotion.js
// ======================================================
const { pool } = require('../config/database');

const Promotion = {
    // ==================================================
    // LISTAR PROMOÇÕES ATIVAS NO MOMENTO
    // ==================================================
    async findActive() {
        const query = `
            SELECT pr.*,
                   c.name AS restricted_category_name,
                   c.slug AS restricted_category_slug,
                   (SELECT json_agg(json_build_object(
                       'id', p.id,
                       'name', p.name,
                       'slug', p.slug,
                       'price', p.price
                   ))
                    FROM promotion_products pp
                    JOIN products p ON pp.product_id = p.id
                    WHERE pp.promotion_id = pr.id AND pp.excluded = false) as products
            FROM promotions pr
            LEFT JOIN categories c ON c.id = pr.restricted_category_id
            WHERE pr.is_active = true
              AND pr.start_date <= CURRENT_TIMESTAMP
              AND pr.end_date >= CURRENT_TIMESTAMP
            ORDER BY pr.discount_value DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    // ==================================================
    // BUSCAR POR CÓDIGO
    // ==================================================
    async findByCode(code) {
        const now = new Date();
        const query = `
            SELECT * FROM promotions
            WHERE code = $1
              AND is_active = true
              AND start_date <= $2
              AND end_date >= $2
        `;
        const result = await pool.query(query, [code, now]);
        return result.rows[0] || null;
    },

    // ==================================================
    // BUSCAR POR ID
    // ==================================================
    async findById(id) {
        const query = `
            SELECT pr.*,
                   c.name AS restricted_category_name,
                   c.slug AS restricted_category_slug
            FROM promotions pr
            LEFT JOIN categories c ON c.id = pr.restricted_category_id
            WHERE pr.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // LISTAR TODAS (admin, com filtros)
    // ==================================================
    async findAll({ q = '', status = 'all', sort = 'created_at', order = 'desc' } = {}) {
        const conditions = ['1=1'];
        const params = [];
        let p = 1;

        if (q && q.trim()) {
            conditions.push(`(pr.code ILIKE $${p} OR pr.name ILIKE $${p})`);
            params.push(`%${q.trim()}%`);
            p++;
        }

        if (status === 'active') {
            conditions.push(`pr.is_active = true AND pr.start_date <= NOW() AND pr.end_date >= NOW()`);
        } else if (status === 'inactive') {
            conditions.push(`pr.is_active = false`);
        } else if (status === 'expired') {
            conditions.push(`pr.end_date < NOW()`);
        } else if (status === 'scheduled') {
            conditions.push(`pr.start_date > NOW()`);
        }

        const sortMap = {
            created_at: 'pr.created_at',
            name: 'pr.name',
            usage_count: 'pr.usage_count',
            end_date: 'pr.end_date',
            discount_value: 'pr.discount_value',
        };
        const sortField = sortMap[sort] || 'pr.created_at';
        const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        const query = `
            SELECT pr.*,
                   c.name AS restricted_category_name,
                   c.slug AS restricted_category_slug,
                   (SELECT COUNT(*)::int FROM promotion_usage WHERE promotion_id = pr.id AND is_reset = FALSE) AS unique_users_used
            FROM promotions pr
            LEFT JOIN categories c ON c.id = pr.restricted_category_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY ${sortField} ${sortOrder}
        `;

        const result = await pool.query(query, params);
        return result.rows;
    },

    // ==================================================
    // CRIAR
    // ==================================================
    async create(data) {
        const {
            name, description, code, discount_type, discount_value,
            min_purchase, max_discount, usage_limit, user_limit,
            start_date, end_date, is_active, applies_to_all,
            restricted_category_id,
        } = data;

        const query = `
            INSERT INTO promotions (
                name, description, code, discount_type, discount_value,
                min_purchase, max_discount, usage_limit, user_limit,
                start_date, end_date, is_active, applies_to_all,
                restricted_category_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const values = [
            name, description || null, code || null,
            discount_type, discount_value,
            min_purchase || null, max_discount || null,
            usage_limit || null, user_limit || null,
            start_date, end_date,
            is_active !== undefined ? is_active : true,
            applies_to_all !== undefined ? applies_to_all : true,
            restricted_category_id || null,
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // ==================================================
    // INCREMENTAR USO (contador global)
    // ==================================================
    async incrementUsage(id) {
        const query = `
            UPDATE promotions
            SET usage_count = usage_count + 1
            WHERE id = $1
            RETURNING usage_count, usage_limit
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    // ==================================================
    // ATUALIZAR
    // ==================================================
    async update(id, data) {
        const allowedFields = [
            'name', 'description', 'code', 'discount_type', 'discount_value',
            'min_purchase', 'max_discount', 'usage_limit', 'user_limit',
            'start_date', 'end_date', 'is_active', 'applies_to_all',
            'restricted_category_id',
        ];
        const fields = [];
        const values = [];
        let paramCounter = 1;

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = $${paramCounter}`);
                values.push(data[field]);
                paramCounter++;
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const query = `
            UPDATE promotions
            SET ${fields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING *
        `;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    // ==================================================
    // DELETAR
    // ==================================================
    async delete(id) {
        const query = 'DELETE FROM promotions WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // BUSCAR PRODUTOS DE UMA CATEGORIA (inclui subcategorias)
    // ==================================================
    async getCategoryProducts(categoryId) {
        const query = `
            WITH RECURSIVE category_tree AS (
                SELECT id FROM categories WHERE id = $1
                UNION ALL
                SELECT c.id FROM categories c
                INNER JOIN category_tree ct ON c.parent_id = ct.id
            )
            SELECT p.id
            FROM products p
            INNER JOIN category_tree ct ON p.category_id = ct.id
            WHERE p.deleted_at IS NULL
              AND p.is_active = true
        `;
        const result = await pool.query(query, [categoryId]);
        return result.rows;
    },

    // ==================================================
    // CUPONS DISPONÍVEIS PARA UM CARRINHO
    // ==================================================
    async findAvailableForCart({ subtotal = 0, userId = null, cartItems = [] } = {}) {
        const query = `
            SELECT *
            FROM promotions
            WHERE is_active = true
              AND code IS NOT NULL
              AND start_date <= NOW()
              AND end_date >= NOW()
              AND (usage_limit IS NULL OR usage_count < usage_limit)
              AND (min_purchase IS NULL OR $1 >= min_purchase)
            ORDER BY discount_value DESC
        `;
        const result = await pool.query(query, [subtotal]);
        const candidates = result.rows;

        let usedIds = [];
        if (userId) {
            // SÓ bloqueia se o uso for ATUAL (is_reset = FALSE)
            const usageQuery = `
                SELECT promotion_id FROM promotion_usage 
                WHERE user_id = $1 AND is_reset = FALSE
            `;
            const usageResult = await pool.query(usageQuery, [userId]);
            usedIds = usageResult.rows.map((r) => r.promotion_id);
        }

        let userHasOrders = false;
        if (userId) {
            const orderCheck = await pool.query(
                "SELECT 1 FROM orders WHERE user_id = $1 AND status != 'cancelled' LIMIT 1",
                [userId]
            );
            userHasOrders = orderCheck.rows.length > 0;
        }

        const available = [];

        for (const promo of candidates) {
            if (usedIds.includes(promo.id)) continue;

if (promo.is_first_purchase_only && userHasOrders) {
    continue; // Esconde o cupom
}

            let eligibleSubtotal = subtotal;
            let hasEligibleItems = true;

            if (promo.restricted_category_id) {
                const categoryProducts = await this.getCategoryProducts(promo.restricted_category_id);
                const eligibleIds = new Set(categoryProducts.map((p) => p.id));
                const eligibleItems = cartItems.filter((item) => eligibleIds.has(item.product_id));

                if (eligibleItems.length === 0) {
                    hasEligibleItems = false;
                } else {
                    eligibleSubtotal = eligibleItems.reduce((sum, item) => {
                        const basePrice = parseFloat(item.price || 0);
                        const discount = parseFloat(item.discount_percent || 0);
                        const unitPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
                        return sum + unitPrice * (item.quantity || 1);
                    }, 0);
                }
            }

            if (!hasEligibleItems) continue;

            let savings = 0;
            const discountValue = parseFloat(promo.discount_value);

            if (promo.discount_type === 'percentage') {
                savings = (eligibleSubtotal * discountValue) / 100;
                if (promo.max_discount) {
                    savings = Math.min(savings, parseFloat(promo.max_discount));
                }
            } else if (promo.discount_type === 'fixed') {
                savings = Math.min(discountValue, eligibleSubtotal);
            }

            if (savings <= 0) continue;

            available.push({
                id: promo.id,
                code: promo.code,
                name: promo.name,
                description: promo.description,
                discount_type: promo.discount_type,
                discount_value: discountValue,
                min_purchase: promo.min_purchase ? parseFloat(promo.min_purchase) : null,
                max_discount: promo.max_discount ? parseFloat(promo.max_discount) : null,
                restricted_category_id: promo.restricted_category_id,
                applies_to_all: promo.applies_to_all,
                savings: Math.round(savings * 100) / 100,
                eligible_subtotal: Math.round(eligibleSubtotal * 100) / 100,
            });
        }

        available.sort((a, b) => b.savings - a.savings);
        return available;
    },

    // ==================================================
    // VERIFICAR SE USUÁRIO JÁ USOU (Considera apenas usos atuais)
    // ==================================================
    async hasUserUsed(userId, promotionId) {
        const query = `
            SELECT id FROM promotion_usage
            WHERE user_id = $1 AND promotion_id = $2
              AND is_reset = FALSE -- Ignora usos antigos que já foram resetados
            LIMIT 1
        `;
        const result = await pool.query(query, [userId, promotionId]);
        return result.rows.length > 0;
    },

    // ==================================================
    // REGISTRAR USO
    // ==================================================
    async registerUsage({ userId, promotionId, orderId }) {
        const query = `
            INSERT INTO promotion_usage (user_id, promotion_id, order_id, is_reset)
            VALUES ($1, $2, $3, FALSE)
            RETURNING *
        `;
        const result = await pool.query(query, [userId, promotionId, orderId]);
        return result.rows[0] || null;
    },

    // ==================================================
    // RESETAR CUPOM (Marca usos antigos como resetados, mantendo histórico)
    // ==================================================
    async resetUsage(promotionId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Marca todos os usos atuais como "resetados" (não os apaga do histórico)
            const updateUsageQuery = `
                UPDATE promotion_usage 
                SET is_reset = TRUE 
                WHERE promotion_id = $1 AND is_reset = FALSE
                RETURNING id
            `;
            const updateResult = await client.query(updateUsageQuery, [promotionId]);

            // 2. Zera o contador global (usage_count)
            await client.query('UPDATE promotions SET usage_count = 0 WHERE id = $1', [promotionId]);

            await client.query('COMMIT');

            return {
                new_usage_count: 0,
                history_cleared: updateResult.rowCount
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ==================================================
    // LISTAR HISTÓRICO COMPLETO DE USOS (Mostra TUDO, inclusive resetados)
    // ==================================================
    async findUsages(promotionId) {
        const query = `
            SELECT
                pu.id,
                pu.used_at,
                pu.order_id,
                pu.is_reset,
                u.id AS user_id,
                u.full_name,
                u.email
            FROM promotion_usage pu
            INNER JOIN users u ON u.id = pu.user_id
            WHERE pu.promotion_id = $1
            ORDER BY pu.used_at DESC
        `;
        const result = await pool.query(query, [promotionId]);
        return result.rows;
    },

    // ==================================================
    // LIBERAR USO (chamado no cancelamento do pedido)
    // ==================================================
    async releaseUsage(orderId) {
        const query = 'DELETE FROM promotion_usage WHERE order_id = $1 RETURNING promotion_id';
        const result = await pool.query(query, [orderId]);
        return result.rows;
    },
};

module.exports = Promotion;