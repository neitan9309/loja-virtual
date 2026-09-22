const { pool } = require('../config/database');

const Brand = {
    async findAll(includeInactive = false) {
        let query = `
            SELECT b.*, 
                   (SELECT COUNT(*) FROM products p 
                    WHERE p.brand_id = b.id AND p.deleted_at IS NULL AND p.is_active = true) as product_count
            FROM brands b
        `;

        if (!includeInactive) {
            query += ' WHERE b.is_active = true';
        }

        query += ' ORDER BY b.name';

        const result = await pool.query(query);
        return result.rows;
    },

    async findById(id) {
        const query = 'SELECT * FROM brands WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    async findBySlug(slug) {
        const query = 'SELECT * FROM brands WHERE slug = $1';
        const result = await pool.query(query, [slug]);
        return result.rows[0] || null;
    },

    async create(data) {
        const { name, slug, logo_url, description, website_url, is_active } = data;
        const query = `
            INSERT INTO brands (name, slug, logo_url, description, website_url, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            name, slug, logo_url || null, description || null,
            website_url || null, is_active !== undefined ? is_active : true
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async update(id, data) {
        const allowedFields = ['name', 'slug', 'logo_url', 'description', 'website_url', 'is_active'];
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
            UPDATE brands 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter}
            RETURNING *
        `;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    async delete(id) {
        const query = 'DELETE FROM brands WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }
};

module.exports = Brand;