// ======================================================
// src/models/Product.js
// ======================================================
const { pool } = require('../config/database');

// ======================================================
// FILTROS REUTILIZÁVEIS (findAll + count)
// Evita duplicação de lógica entre os dois métodos
// ======================================================
function buildFilters(filters = {}) {
    const {
        category,
        brand,
        min_price,
        max_price,
        search,
        featured,
        is_new,
        best_seller,
        on_sale,
    } = filters;

    const conditions = ['p.deleted_at IS NULL', 'p.is_active = true'];
    const params = [];
    let paramCounter = 1;

    // Categoria — com WITH RECURSIVE para pegar descendentes
    if (category) {
        const isNumeric = !isNaN(category) && category.toString().trim() !== '';
        if (isNumeric) {
            conditions.push(`p.category_id IN (
                WITH RECURSIVE descendants AS (
                    SELECT id FROM categories WHERE id = $${paramCounter}
                    UNION ALL
                    SELECT c.id FROM categories c
                    JOIN descendants d ON c.parent_id = d.id
                )
                SELECT id FROM descendants
            )`);
            params.push(parseInt(category));
        } else {
            conditions.push(`p.category_id IN (
                WITH RECURSIVE descendants AS (
                    SELECT id FROM categories WHERE slug = $${paramCounter}
                    UNION ALL
                    SELECT c.id FROM categories c
                    JOIN descendants d ON c.parent_id = d.id
                )
                SELECT id FROM descendants
            )`);
            params.push(category);
        }
        paramCounter++;
    }

    if (brand) {
        const isNumeric = !isNaN(brand) && brand.toString().trim() !== '';
        if (isNumeric) {
            conditions.push(`b.id = $${paramCounter}`);
            params.push(parseInt(brand));
        } else {
            conditions.push(`b.slug = $${paramCounter}`);
            params.push(brand);
        }
        paramCounter++;
    }

    if (min_price !== undefined && min_price !== '') {
        conditions.push(`p.price >= $${paramCounter}`);
        params.push(parseFloat(min_price));
        paramCounter++;
    }

    if (max_price !== undefined && max_price !== '') {
        conditions.push(`p.price <= $${paramCounter}`);
        params.push(parseFloat(max_price));
        paramCounter++;
    }

    if (search) {
        conditions.push(`(p.name ILIKE $${paramCounter} OR p.description ILIKE $${paramCounter} OR p.short_description ILIKE $${paramCounter})`);
        params.push(`%${search}%`);
        paramCounter++;
    }

    if (featured === true || featured === 'true') conditions.push('p.is_featured = true');
    if (is_new === true || is_new === 'true') conditions.push('p.is_new = true');
    if (best_seller === true || best_seller === 'true') conditions.push('p.is_best_seller = true');
    if (on_sale === true || on_sale === 'true') conditions.push('p.discount_percent > 0');

    return { conditions, params, paramCounter };
}

const Product = {
    // ======================================================
    // LISTAR PRODUTOS COM FILTROS + BREADCRUMB DE CATEGORIA
    // ======================================================
    async findAll(filters = {}) {
        const {
            sort = 'created_at',
            order = 'DESC',
            limit = 20,
            offset = 0,
        } = filters;

        const { conditions, params, paramCounter } = buildFilters(filters);

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
            WHERE ${conditions.join(' AND ')}
        `;

        const allowedSorts = ['price', 'rating_avg', 'sales_count', 'created_at', 'name', 'view_count', 'discount_percent'];
        const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        if (filters.best_seller === true || filters.best_seller === 'true') {
            query += ` ORDER BY p.sales_count DESC, p.created_at DESC`;
        } else {
            query += ` ORDER BY p.${sortField} ${sortOrder}`;
        }

        query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        return result.rows;
    },

    // ======================================================
    // CONTAR TOTAL DE PRODUTOS (usa os mesmos filtros)
    // ======================================================
    async count(filters = {}) {
        const { conditions, params } = buildFilters(filters);

        const query = `
            SELECT COUNT(*) as total
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE ${conditions.join(' AND ')}
        `;

        const result = await pool.query(query, params);
        return parseInt(result.rows[0].total);
    },

    // ======================================================
    // BUSCAR PRODUTO POR ID (com breadcrumb)
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
    // BUSCAR PRODUTO POR SLUG (versão leve)
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
            is_best_seller, meta_title, meta_description, meta_keywords,
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
            meta_title || null, meta_description || null, meta_keywords || null,
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
            'is_best_seller', 'meta_title', 'meta_description', 'meta_keywords',
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
    },

    // ======================================================
    // BUSCAR PRODUTOS (aba "Alterar Produto")
    // ======================================================
    async search(query, limit = 20, offset = 0) {
        const searchTerm = `%${query}%`;

        const sql = `
            SELECT
                p.id, p.name, p.slug, p.sku, p.price, p.discount_percent,
                p.stock_quantity, p.is_active, p.deleted_at,
                c.name as category_name,
                b.name as brand_name
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN brands b ON b.id = p.brand_id
            WHERE p.deleted_at IS NULL
              AND (
                p.name ILIKE $1
                OR p.sku ILIKE $1
                OR CAST(p.id AS TEXT) = $2
              )
            ORDER BY p.name ASC
            LIMIT $3 OFFSET $4
        `;

        const result = await pool.query(sql, [searchTerm, query, limit, offset]);

        const countSql = `
            SELECT COUNT(*) as total
            FROM products p
            WHERE p.deleted_at IS NULL
              AND (
                p.name ILIKE $1
                OR p.sku ILIKE $1
                OR CAST(p.id AS TEXT) = $2
              )
        `;
        const countResult = await pool.query(countSql, [searchTerm, query]);

        return {
            products: result.rows,
            total: parseInt(countResult.rows[0].total),
        };
    },

    // ======================================================
    // LISTAR PRODUTOS PARA O ADMIN
    // ======================================================
    async adminList(filters = {}) {
        const {
            q = '',
            min_price,
            max_price,
            stock = 'all',
            sort = 'date_desc',
            page = 1,
            limit = 20,
        } = filters;

        const conditions = ['p.deleted_at IS NULL'];
        const params = [];
        let paramCounter = 1;

        if (q) {
            conditions.push(`(
                p.name ILIKE $${paramCounter}
                OR p.sku ILIKE $${paramCounter}
                OR CAST(p.id AS TEXT) = $${paramCounter + 1}
            )`);
            params.push(`%${q}%`, q);
            paramCounter += 2;
        }

        if (min_price !== undefined && min_price !== null && min_price !== '') {
            conditions.push(`p.price >= $${paramCounter}`);
            params.push(parseFloat(min_price));
            paramCounter++;
        }

        if (max_price !== undefined && max_price !== null && max_price !== '') {
            conditions.push(`p.price <= $${paramCounter}`);
            params.push(parseFloat(max_price));
            paramCounter++;
        }

        if (stock === 'in') conditions.push('p.stock_quantity > 10');
        else if (stock === 'low') conditions.push('p.stock_quantity > 0 AND p.stock_quantity <= 10');
        else if (stock === 'out') conditions.push('p.stock_quantity = 0');

        const sortMap = {
            date_desc: 'p.created_at DESC',
            date_asc: 'p.created_at ASC',
            price_asc: 'p.price ASC',
            price_desc: 'p.price DESC',
            name_asc: 'p.name ASC',
            name_desc: 'p.name DESC',
        };
        const orderBy = sortMap[sort] || 'p.created_at DESC';

        const offset = (page - 1) * limit;
        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const sql = `
            SELECT
                p.id, p.name, p.slug, p.sku, p.price, p.discount_percent,
                p.stock_quantity, p.is_active, p.created_at,
                c.name as category_name,
                b.name as brand_name
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN brands b ON b.id = p.brand_id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
        `;

        const queryParams = [...params, limit, offset];
        const result = await pool.query(sql, queryParams);

        const countSql = `
            SELECT COUNT(*) as total
            FROM products p
            ${whereClause}
        `;
        const countResult = await pool.query(countSql, params);

        return {
            products: result.rows,
            total: parseInt(countResult.rows[0].total),
        };
    },

    // ======================================================
    // ATUALIZAR UM ÚNICO CAMPO
    // ======================================================
    async updateField(id, field, value) {
        const allowedFields = [
            'name', 'slug', 'sku', 'description', 'short_description',
            'category_id', 'brand_id', 'price', 'cost_price',
            'discount_percent', 'stock_quantity', 'stock_status',
            'weight', 'dimensions', 'is_active', 'is_featured', 'is_new',
            'is_best_seller', 'meta_title', 'meta_description', 'meta_keywords',
        ];

        if (!allowedFields.includes(field)) {
            throw new Error(`Campo "${field}" não pode ser editado`);
        }

        const query = `
            UPDATE products
            SET ${field} = $1
            WHERE id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await pool.query(query, [value, id]);
        return result.rows[0] || null;
    },

    // ======================================================
    // IMAGENS — com transação (evita 2 primárias)
    // ======================================================
    async addImage(productId, { image_url, alt_text = null, is_primary = false }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (is_primary) {
                await client.query(
                    'UPDATE product_images SET is_primary = FALSE WHERE product_id = $1',
                    [productId]
                );
            }

            const countResult = await client.query(
                'SELECT COUNT(*) as total FROM product_images WHERE product_id = $1',
                [productId]
            );
            const total = parseInt(countResult.rows[0].total);
            const shouldBePrimary = is_primary || total === 0;

            const query = `
                INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const result = await client.query(query, [
                productId,
                image_url,
                alt_text,
                shouldBePrimary,
                total,
            ]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async removeImage(productId, imageId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const check = await client.query(
                'SELECT * FROM product_images WHERE id = $1 AND product_id = $2',
                [imageId, productId]
            );

            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            const wasPrimary = check.rows[0].is_primary;

            await client.query('DELETE FROM product_images WHERE id = $1', [imageId]);

            if (wasPrimary) {
                await client.query(`
                    UPDATE product_images
                    SET is_primary = TRUE
                    WHERE id = (
                        SELECT id FROM product_images
                        WHERE product_id = $1
                        ORDER BY sort_order, id
                        LIMIT 1
                    )
                `, [productId]);
            }

            await client.query('COMMIT');
            return { removed: imageId };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async setPrimaryImage(productId, imageId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'UPDATE product_images SET is_primary = FALSE WHERE product_id = $1',
                [productId]
            );

            const query = `
                UPDATE product_images
                SET is_primary = TRUE
                WHERE id = $1 AND product_id = $2
                RETURNING *
            `;
            const result = await client.query(query, [imageId, productId]);

            await client.query('COMMIT');
            return result.rows[0] || null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
};

module.exports = Product;