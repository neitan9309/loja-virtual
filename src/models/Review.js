// ======================================================
// src/models/Review.js
// ======================================================
const { pool } = require('../config/database');

const Review = {
    // ==================================================
    // LISTAR AVALIAÇÕES DE UM PRODUTO (público)
    // ==================================================
    async findByProduct(productId, { limit = 50, offset = 0 } = {}) {
        const query = `
            SELECT
                pr.id,
                pr.rating,
                pr.title,
                pr.comment,
                pr.is_verified_purchase,
                pr.helpful_count,
                pr.created_at,
                pr.updated_at,
                u.full_name AS author_name
            FROM product_reviews pr
            LEFT JOIN users u ON u.id = pr.user_id
            WHERE pr.product_id = $1
              AND pr.is_approved = TRUE
            ORDER BY pr.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [productId, limit, offset]);
        return result.rows;
    },

    // ==================================================
    // ESTATÍSTICAS (média + total)
    // ==================================================
    async getStats(productId) {
        const query = `
            SELECT
                COALESCE(AVG(rating), 0)::numeric(3,2) AS avg_rating,
                COUNT(*)::int AS total_reviews
            FROM product_reviews
            WHERE product_id = $1
              AND is_approved = TRUE
        `;
        const result = await pool.query(query, [productId]);
        return {
            avg_rating: parseFloat(result.rows[0].avg_rating) || 0,
            total_reviews: result.rows[0].total_reviews || 0,
        };
    },

    // ==================================================
    // BUSCAR AVALIAÇÃO DO USUÁRIO ATUAL
    // ==================================================
    async findByUserAndProduct(userId, productId) {
        const query = `
            SELECT * FROM product_reviews
            WHERE user_id = $1 AND product_id = $2
        `;
        const result = await pool.query(query, [userId, productId]);
        return result.rows[0] || null;
    },

    // ==================================================
    // CRIAR (aprova automaticamente)
    // ==================================================
    async create({ product_id, user_id, rating, title, comment }) {
        const query = `
            INSERT INTO product_reviews
                (product_id, user_id, rating, title, comment, is_approved)
            VALUES ($1, $2, $3, $4, $5, TRUE)
            RETURNING *
        `;
        const result = await pool.query(query, [
            product_id,
            user_id,
            rating,
            title || null,
            comment || null,
        ]);
        return result.rows[0];
    },

    // ==================================================
    // ATUALIZAR (usuário edita a própria)
    // ==================================================
    async update(id, userId, { rating, title, comment }) {
        const query = `
            UPDATE product_reviews
            SET
                rating = COALESCE($1, rating),
                title = COALESCE($2, title),
                comment = COALESCE($3, comment),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND user_id = $5
            RETURNING *
        `;
        const result = await pool.query(query, [
            rating,
            title,
            comment,
            id,
            userId,
        ]);
        return result.rows[0] || null;
    },

    // ==================================================
    // RECALCULAR rating_avg/rating_count DO PRODUTO
    // ==================================================
    async syncProductRating(productId) {
        const query = `
            UPDATE products
            SET
                rating_avg = COALESCE(
                    (SELECT AVG(rating) FROM product_reviews
                     WHERE product_id = $1 AND is_approved = TRUE),
                    0
                ),
                rating_count = (
                    SELECT COUNT(*) FROM product_reviews
                    WHERE product_id = $1 AND is_approved = TRUE
                )
            WHERE id = $1
        `;
        await pool.query(query, [productId]);
    },

    // ==================================================
    // DELETAR (opcional)
    // ==================================================
    async delete(id, userId) {
        const query = `
            DELETE FROM product_reviews
            WHERE id = $1 AND user_id = $2
            RETURNING product_id
        `;
        const result = await pool.query(query, [id, userId]);
        return result.rows[0] || null;
    },
};

module.exports = Review;