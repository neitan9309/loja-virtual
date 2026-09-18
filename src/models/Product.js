const { pool } = require('../config/database');

const Product = {
    // ======================================================
    // LISTAR PRODUTOS COM FILTROS + BREADCRUMB DE CATEGORIA
    // ======================================================
    async findAll(filters = {}) {
        const {
            category,
            brand,
            min_price,
            max_price,
            search,
            featured,
            is_new,
            best_seller,
            sort = 'created_at',
            order = 'DESC',
            limit = 20,
            offset = 0
        } = filters;

        let query = `
            SELECT p.*, 
                   c.name as category_name,
                   c.slug as category_slug,
                   b.name as brand_name,
                   b.slug as brand_slug,
                   (SELECT json_agg(json_build_object(
                       'id', pi.id, 
                       'url', pi.image_url, 
                       'alt', pi.alt_text,
                       'primary', pi.is_primary
                   ) ORDER BY pi.sort_order)
                    FROM product_images pi WHERE pi.product_id = p.id) as images,
                   (SELECT json_agg(json_build_object(
                       'id', cp.id,
                       'name', cp.name,
                       'slug', cp.slug,
                       'level', cp.level
                   ) ORDER BY cp.level DESC)
                    FROM (
                        WITH RECURSIVE category_path AS (
                            SELECT id, name, slug, parent_id, 0 as level
                            FROM categories WHERE id = p.category_id
                            UNION ALL
                            SELECT c2.id, c2.name, c2.slug, c2.parent_id, cp2.level + 1
                            FROM categories c2
                            JOIN category_path cp2 ON c2.id = cp2.parent_id
                        )
                        SELECT * FROM category_path
                    ) cp) as category_path
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.deleted_at IS NULL AND p.is_active = true
        `;

        const params = [];
        let paramCounter = 1;

        // Filtro por categoria (ID ou slug; inclui filhas quando aplicável)
        if (category) {
            if (!isNaN(category) && category.toString().trim() !== '') {
                query += ` AND (c.id = $${paramCounter} OR c.parent_id = $${paramCounter})`;
                params.push(parseInt(category));
            } else {
                query += ` AND (c.slug = $${paramCounter} OR c.parent_id IN (SELECT id FROM categories WHERE slug = $${paramCounter}))`;
                params.push(category);
            }
            paramCounter++;
        }

        // Filtro por marca
        if (brand) {
            if (!isNaN(brand) && brand.toString().trim() !== '') {
                query += ` AND b.id = $${paramCounter}`;
                params.push(parseInt(brand));
            } else {
                query += ` AND b.slug = $${paramCounter}`;
                params.push(brand);
            }
            paramCounter++;
        }

        if (min_price !== undefined && min_price !== '') {
            query += ` AND p.price >= $${paramCounter}`;
            params.push(parseFloat(min_price));
            paramCounter++;
        }

        if (max_price !== undefined && max_price !== '') {
            query += ` AND p.price <= $${paramCounter}`;
            params.push(parseFloat(max_price));
            paramCounter++;
        }

        if (search) {
            query += ` AND (p.name ILIKE $${paramCounter} OR p.description ILIKE $${paramCounter} OR p.short_description ILIKE $${paramCounter})`;
            params.push(`%${search}%`);
            paramCounter++;
        }

        if (featured === true || featured === 'true') query += ` AND p.is_featured = true`;
        if (is_new === true || is_new === 'true') query += ` AND p.is_new = true`;
        if (best_seller === true || best_seller === 'true') query += ` AND p.is_best_seller = true`;

        const allowedSorts = ['price', 'rating_avg', 'sales_count', 'created_at', 'name', 'view_count'];
        const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY p.${sortField} ${sortOrder}`;

        query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        return result.rows;
    },

    // ======================================================
    // CONTAR TOTAL DE PRODUTOS (com os mesmos filtros)
    // ======================================================
    async count(filters = {}) {
        const { category, brand, min_price, max_price, search, featured, is_new, best_seller } = filters;

        let query = `
            SELECT COUNT(*) as total
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.deleted_at IS NULL AND p.is_active = true
        `;

        const params = [];
        let paramCounter = 1;

        if (category) {
            if (!isNaN(category) && category.toString().trim() !== '') {
                query += ` AND (c.id = $${paramCounter} OR c.parent_id = $${paramCounter})`;
                params.push(parseInt(category));
            } else {
                query += ` AND (c.slug = $${paramCounter} OR c.parent_id IN (SELECT id FROM categories WHERE slug = $${paramCounter}))`;
                params.push(category);
            }
            paramCounter++;
        }

        if (brand) {
            if (!isNaN(brand) && brand.toString().trim() !== '') {
                query += ` AND b.id = $${paramCounter}`;
                params.push(parseInt(brand));
            } else {
                query += ` AND b.slug = $${paramCounter}`;
                params.push(brand);
            }
            paramCounter++;
        }

        if (min_price !== undefined && min_price !== '') {
            query += ` AND p.price >= $${paramCounter}`;
            params.push(parseFloat(min_price));
            paramCounter++;
        }

        if (max_price !== undefined && max_price !== '') {
            query += ` AND p.price <= $${paramCounter}`;
            params.push(parseFloat(max_price));
            paramCounter++;
        }

        if (search) {
            query += ` AND (p.name ILIKE $${paramCounter} OR p.description ILIKE $${paramCounter} OR p.short_description ILIKE $${paramCounter})`;
            params.push(`%${search}%`);
            paramCounter++;
        }

        if (featured === true || featured === 'true') query += ` AND p.is_featured = true`;
        if (is_new === true || is_new === 'true') query += ` AND p.is_new = true`;
        if (best_seller === true || best_seller === 'true') query += ` AND p.is_best_seller = true`;

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].total);
    },

    // ======================================================
    // BUSCAR PRODUTO POR ID (com breadcrumb de categoria)
    // ======================================================
    async findById(id) {
        const query = `
            WITH RECURSIVE category_path AS (
                SELECT id, name, slug, parent_id, 0 as level
                FROM categories
                WHERE id = (SELECT category_id FROM products WHERE id = $1)
                UNION ALL
                SELECT c.id, c.name, c.slug, c.parent_id, cp.level + 1
                FROM categories c
                JOIN category_path cp ON c.id = cp.parent_id
            )
            SELECT p.*, 
                   c.name as category_name,
                   c.slug as category_slug,
                   sc.name as subcategory_name,
                   b.name as brand_name,
                   b.slug as brand_slug,
                   (SELECT json_agg(json_build_object(
                       'id', pi.id, 
                       'url', pi.image_url, 
                       'alt', pi.alt_text,
                       'primary', pi.is_primary
                   ) ORDER BY pi.sort_order)
                    FROM product_images pi WHERE pi.product_id = p.id) as images,
                   (SELECT json_agg(json_build_object(
                       'id', pv.id, 
                       'type', pv.variation_type, 
                       'value', pv.variation_value, 
                       'sku', pv.sku, 
                       'price_adjustment', pv.price_adjustment, 
                       'stock', pv.stock_quantity,
                       'image_url', pv.image_url
                   ))
                    FROM product_variations pv 
                    WHERE pv.product_id = p.id AND pv.is_active = true) as variations,
                   (SELECT json_agg(json_build_object(
                       'id', ps.id, 
                       'name', ps.spec_name, 
                       'value', ps.spec_value
                   ))
                    FROM product_specifications ps WHERE ps.product_id = p.id) as specifications,
                   (SELECT json_agg(json_build_object(
                       'id', pr.id, 
                       'rating', pr.rating, 
                       'title', pr.title,
                       'comment', pr.comment, 
                       'helpful_count', pr.helpful_count,
                       'created_at', pr.created_at
                   ) ORDER BY pr.created_at DESC)
                    FROM product_reviews pr 
                    WHERE pr.product_id = p.id AND pr.is_approved = true) as reviews,
                   (SELECT json_agg(json_build_object(
                       'id', cp.id,
                       'name', cp.name,
                       'slug', cp.slug,
                       'level', cp.level
                   ) ORDER BY cp.level DESC)
                    FROM category_path cp) as category_path
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.id = $1 AND p.deleted_at IS NULL
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ======================================================
    // BUSCAR PRODUTO POR SLUG
    // ======================================================
    async findBySlug(slug) {
        const query = `
            SELECT p.* FROM products p
            WHERE p.slug = $1 AND p.deleted_at IS NULL
        `;
        const result = await pool.query(query, [slug]);
        return result.rows[0] || null;
    },

    // ======================================================
    // CRIAR PRODUTO
    // ======================================================
    async create(data) {
        const {
            name, slug, sku, description, short_description,
            category_id, subcategory_id, brand_id, price, cost_price,
            discount_percent, stock_quantity, stock_status,
            weight, dimensions, is_active, is_featured, is_new,
            is_best_seller, meta_title, meta_description, meta_keywords
        } = data;

        const query = `
            INSERT INTO products (
                name, slug, sku, description, short_description,
                category_id, subcategory_id, brand_id, price, cost_price,
                discount_percent, stock_quantity, stock_status,
                weight, dimensions, is_active, is_featured, is_new,
                is_best_seller, meta_title, meta_description, meta_keywords
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )
            RETURNING *
        `;
        const values = [
            name, slug, sku, description, short_description || null,
            category_id, subcategory_id || null, brand_id || null,
            price, cost_price || null,
            discount_percent || 0, stock_quantity || 0, stock_status || 'in_stock',
            weight || null, dimensions || null,
            is_active !== undefined ? is_active : true,
            is_featured || false, is_new || false, is_best_seller || false,
            meta_title || null, meta_description || null, meta_keywords || null
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // ======================================================
    // ATUALIZAR PRODUTO
    // ======================================================
    async update(id, data) {
        const allowedFields = [
            'name', 'slug', 'sku', 'description', 'short_description',
            'category_id', 'subcategory_id', 'brand_id', 'price', 'cost_price',
            'discount_percent', 'stock_quantity', 'stock_status',
            'weight', 'dimensions', 'is_active', 'is_featured', 'is_new',
            'is_best_seller', 'meta_title', 'meta_description', 'meta_keywords'
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
            UPDATE products 
            SET ${fields.join(', ')} 
            WHERE id = $${paramCounter} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    // ======================================================
    // SOFT DELETE
    // ======================================================
    async softDelete(id) {
        const query = `
            UPDATE products 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ======================================================
    // INCREMENTAR VISUALIZAÇÕES
    // ======================================================
    async incrementViewCount(id) {
        await pool.query(
            'UPDATE products SET view_count = view_count + 1 WHERE id = $1',
            [id]
        );
    }
};

module.exports = Product;