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
            WHERE pr.is_active = true 
              AND pr.start_date <= CURRENT_TIMESTAMP 
              AND pr.end_date >= CURRENT_TIMESTAMP
            ORDER BY pr.discount_value DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    // ==================================================
    // BUSCAR POR CÓDIGO (validação de cupom)
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
        const query = 'SELECT * FROM promotions WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // LISTAR TODAS
    // ==================================================
    async findAll() {
        const query = 'SELECT * FROM promotions ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    },

    // ==================================================
    // CRIAR
    // ==================================================
    async create(data) {
        const {
            name, description, code, discount_type, discount_value,
            min_purchase, max_discount, usage_limit, user_limit,
            start_date, end_date, is_active, applies_to_all
        } = data;

        const query = `
            INSERT INTO promotions (
                name, description, code, discount_type, discount_value,
                min_purchase, max_discount, usage_limit, user_limit,
                start_date, end_date, is_active, applies_to_all
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;
        const values = [
            name, description || null, code || null,
            discount_type, discount_value,
            min_purchase || null, max_discount || null,
            usage_limit || null, user_limit || null,
            start_date, end_date,
            is_active !== undefined ? is_active : true,
            applies_to_all !== undefined ? applies_to_all : true
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // ==================================================
    // INCREMENTAR USO
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
            'start_date', 'end_date', 'is_active', 'applies_to_all'
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
    // CUPONS DISPONÍVEIS PARA UM CARRINHO
    // Filtra por:
    //   - is_active
    //   - start_date <= now <= end_date
    //   - subtotal >= min_purchase (se definido)
    //   - usage_count < usage_limit (se definido)
    //   - com código (cupons precisam de código)
    // Calcula economia estimada em R$
    // ==================================================
    async findAvailableForCart({ subtotal = 0 }) {
        const query = `
            SELECT
                id, code, name, description, discount_type, discount_value,
                min_purchase, max_discount, usage_limit, usage_count,
                start_date, end_date
            FROM promotions
            WHERE is_active = true
              AND code IS NOT NULL
              AND start_date <= NOW()
              AND end_date >= NOW()
              AND (usage_limit IS NULL OR usage_count < usage_limit)
              AND (min_purchase IS NULL OR $1 >= min_purchase)
            ORDER BY
                CASE
                    WHEN discount_type = 'fixed' THEN discount_value
                    ELSE 0
                END DESC,
                discount_value DESC
        `;

        const result = await pool.query(query, [subtotal]);

        return result.rows.map((p) => {
            const discountValue = parseFloat(p.discount_value);
            let savings = 0;

            if (p.discount_type === 'percentage') {
                savings = (subtotal * discountValue) / 100;
                if (p.max_discount) {
                    savings = Math.min(savings, parseFloat(p.max_discount));
                }
            } else if (p.discount_type === 'fixed') {
                savings = Math.min(discountValue, subtotal);
            }

            return {
                id: p.id,
                code: p.code,
                name: p.name,
                description: p.description,
                discount_type: p.discount_type,
                discount_value: discountValue,
                min_purchase: p.min_purchase ? parseFloat(p.min_purchase) : null,
                max_discount: p.max_discount ? parseFloat(p.max_discount) : null,
                savings: Math.round(savings * 100) / 100,
            };
        });
    },
};

module.exports = Promotion;