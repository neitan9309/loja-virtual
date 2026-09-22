const { pool } = require('../config/database');

const Promotion = {
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

    async findById(id) {
        const query = 'SELECT * FROM promotions WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    async findAll() {
        const query = 'SELECT * FROM promotions ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    },

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

    async delete(id) {
        const query = 'DELETE FROM promotions WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }
};

module.exports = Promotion;