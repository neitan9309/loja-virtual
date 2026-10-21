// ======================================================
// src/models/Wishlist.js
// Favoritos (wishlist) dos usuários
// ======================================================
const { pool } = require('../config/database');

const Wishlist = {
    // ==================================================
    // ADICIONAR À WISHLIST
    // Idempotente: se já existe, não faz nada
    // ==================================================
    async add(userId, productId) {
        // Pega o preço atual do produto (para o snapshot)
        const productResult = await pool.query(
            'SELECT price FROM products WHERE id = $1 AND deleted_at IS NULL',
            [productId]
        );

        if (productResult.rows.length === 0) {
            const err = new Error('Produto não encontrado');
            err.status = 404;
            throw err;
        }

        const currentPrice = parseFloat(productResult.rows[0].price);

        const query = `
            INSERT INTO wishlists (user_id, product_id, price_when_added)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id) DO NOTHING
            RETURNING *
        `;
        const result = await pool.query(query, [userId, productId, currentPrice]);

        // Se o insert retornou 0 linhas, é porque já existia
        if (result.rows.length === 0) {
            return { added: false, alreadyExists: true };
        }

        return { added: true, item: result.rows[0] };
    },

    // ==================================================
    // REMOVER DA WISHLIST
    // ==================================================
    async remove(userId, productId) {
        const query = `
            DELETE FROM wishlists
            WHERE user_id = $1 AND product_id = $2
            RETURNING id
        `;
        const result = await pool.query(query, [userId, productId]);
        return { removed: result.rows.length > 0 };
    },

    // ==================================================
    // VERIFICAR SE UM PRODUTO ESTÁ NA WISHLIST
    // ==================================================
    async isInWishlist(userId, productId) {
        const query = `
            SELECT id FROM wishlists
            WHERE user_id = $1 AND product_id = $2
            LIMIT 1
        `;
        const result = await pool.query(query, [userId, productId]);
        return result.rows.length > 0;
    },

    // ==================================================
    // LISTAR COM DADOS DO PRODUTO
    // ==================================================
    async findByUser(userId, { limit = 100, offset = 0 } = {}) {
        const query = `
            SELECT
                w.id AS wishlist_id,
                w.price_when_added,
                w.created_at AS added_at,
                p.id,
                p.name,
                p.slug,
                p.sku,
                p.price,
                p.discount_percent,
                p.stock_quantity,
                p.is_active,
                p.is_featured,
                p.is_new,
                p.is_best_seller,
                p.short_description,
                (SELECT json_agg(json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'alt', pi.alt_text,
                    'primary', pi.is_primary
                ) ORDER BY pi.is_primary DESC, pi.sort_order)
                FROM product_images pi WHERE pi.product_id = p.id) as images
            FROM wishlists w
            INNER JOIN products p ON p.id = w.product_id
            WHERE w.user_id = $1
              AND p.deleted_at IS NULL
            ORDER BY w.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [userId, limit, offset]);
        return result.rows;
    },

    // ==================================================
    // CONTAR
    // ==================================================
    async countByUser(userId) {
        const result = await pool.query(
            'SELECT COUNT(*)::int as total FROM wishlists WHERE user_id = $1',
            [userId]
        );
        return result.rows[0].total;
    },

    // ==================================================
    // LISTAR APENAS OS IDs (para marcar os cards)
    // ==================================================
    async listProductIds(userId) {
        const result = await pool.query(
            'SELECT product_id FROM wishlists WHERE user_id = $1',
            [userId]
        );
        return result.rows.map((r) => r.product_id);
    },
};

module.exports = Wishlist;