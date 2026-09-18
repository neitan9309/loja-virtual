const { pool } = require('../config/database');

const Category = {
    async findAll(includeInactive = false) {
        let query = `
            SELECT c.*, 
                   (SELECT COUNT(*) FROM products p 
                    WHERE p.category_id = c.id AND p.deleted_at IS NULL AND p.is_active = true) as product_count
            FROM categories c
        `;

        if (!includeInactive) {
            query += ' WHERE c.is_active = true';
        }

        query += ' ORDER BY c.sort_order, c.name';

        const result = await pool.query(query);
        return result.rows;
    },

    // ✅ NOVO: retorna a árvore completa de categorias (3 níveis)
    async findTree() {
        const query = `
            SELECT id, name, slug, description, parent_id, sort_order, is_active
            FROM categories
            WHERE is_active = true
            ORDER BY parent_id NULLS FIRST, sort_order, name
        `;
        const result = await pool.query(query);
        const rows = result.rows;

        const map = {};
        const roots = [];

        rows.forEach(row => {
            map[row.id] = { ...row, children: [] };
        });

        rows.forEach(row => {
            if (row.parent_id && map[row.parent_id]) {
                map[row.parent_id].children.push(map[row.id]);
            } else {
                roots.push(map[row.id]);
            }
        });

        return roots;
    },

    async findById(id) {
        const query = 'SELECT * FROM categories WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    async findBySlug(slug) {
        const query = 'SELECT * FROM categories WHERE slug = $1';
        const result = await pool.query(query, [slug]);
        return result.rows[0] || null;
    },

    async findWithSubcategories() {
        const query = `
            SELECT c.*, 
                   (SELECT json_agg(json_build_object(
                       'id', sc.id,
                       'name', sc.name,
                       'slug', sc.slug
                   ) ORDER BY sc.sort_order)
                    FROM subcategories sc 
                    WHERE sc.category_id = c.id AND sc.is_active = true) as subcategories
            FROM categories c
            WHERE c.is_active = true
            ORDER BY c.sort_order, c.name
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    async create(data) {
        const { name, slug, description, parent_id, image_url, sort_order, is_active } = data;
        const query = `
            INSERT INTO categories (name, slug, description, parent_id, image_url, sort_order, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            name, slug, description || null, parent_id || null,
            image_url || null, sort_order || 0, is_active !== undefined ? is_active : true
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async update(id, data) {
        const allowedFields = ['name', 'slug', 'description', 'parent_id', 'image_url', 'sort_order', 'is_active'];
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
            UPDATE categories 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter}
            RETURNING *
        `;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    async delete(id) {
        const query = 'DELETE FROM categories WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    }
};

module.exports = Category;