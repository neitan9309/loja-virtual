// ======================================================
// src/controllers/reviewController.js
// ======================================================
const { Review, Product } = require('../models');

const reviewController = {
    // ==================================================
    // GET /api/products/:productId/reviews
    // ==================================================
    async list(req, res) {
        try {
            const { productId } = req.params;

            if (isNaN(productId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            const [reviews, stats] = await Promise.all([
                Review.findByProduct(productId, { limit: 50 }),
                Review.getStats(productId),
            ]);

            res.json({ reviews, stats });
        } catch (error) {
            console.error('Erro ao listar avaliações:', error);
            res.status(500).json({ error: 'Erro ao buscar avaliações' });
        }
    },

    // ==================================================
    // GET /api/products/:productId/reviews/mine
    // ==================================================
    async getMine(req, res) {
        try {
            const { productId } = req.params;
            const userId = req.userId;

            if (isNaN(productId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const review = await Review.findByUserAndProduct(userId, productId);
            res.json({ review });
        } catch (error) {
            console.error('Erro ao buscar avaliação do usuário:', error);
            res.status(500).json({ error: 'Erro ao buscar avaliação' });
        }
    },

    // ==================================================
    // POST /api/products/:productId/reviews
    // ==================================================
    async create(req, res) {
        try {
            const { productId } = req.params;
            const userId = req.userId;
            const { rating, title, comment } = req.body;

            if (isNaN(productId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const ratingNum = parseInt(rating, 10);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                return res.status(400).json({ error: 'Nota deve ser entre 1 e 5' });
            }

            if (title && title.length > 100) {
                return res.status(400).json({ error: 'Título muito longo (máx. 100 caracteres)' });
            }

            if (comment && comment.length > 1000) {
                return res.status(400).json({ error: 'Comentário muito longo (máx. 1000 caracteres)' });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            const existing = await Review.findByUserAndProduct(userId, productId);
            if (existing) {
                return res.status(409).json({
                    error: 'Você já avaliou este produto',
                    code: 'ALREADY_REVIEWED',
                    review: existing,
                });
            }

            const review = await Review.create({
                product_id: parseInt(productId, 10),
                user_id: userId,
                rating: ratingNum,
                title: title ? title.trim() : null,
                comment: comment ? comment.trim() : null,
            });

            await Review.syncProductRating(productId);

            res.status(201).json({
                message: 'Avaliação criada com sucesso!',
                review,
            });
        } catch (error) {
            console.error('Erro ao criar avaliação:', error);
            res.status(500).json({ error: 'Erro ao criar avaliação' });
        }
    },

    // ==================================================
    // PUT /api/products/:productId/reviews/:reviewId
    // ==================================================
    async update(req, res) {
        try {
            const { productId, reviewId } = req.params;
            const userId = req.userId;
            const { rating, title, comment } = req.body;

            if (isNaN(productId) || isNaN(reviewId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            let ratingNum = null;
            if (rating !== undefined && rating !== null) {
                ratingNum = parseInt(rating, 10);
                if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                    return res.status(400).json({ error: 'Nota deve ser entre 1 e 5' });
                }
            }

            const review = await Review.update(reviewId, userId, {
                rating: ratingNum,
                title: title !== undefined ? (title ? title.trim() : null) : undefined,
                comment: comment !== undefined ? (comment ? comment.trim() : null) : undefined,
            });

            if (!review) {
                return res.status(404).json({ error: 'Avaliação não encontrada' });
            }

            await Review.syncProductRating(productId);

            res.json({
                message: 'Avaliação atualizada com sucesso!',
                review,
            });
        } catch (error) {
            console.error('Erro ao atualizar avaliação:', error);
            res.status(500).json({ error: 'Erro ao atualizar avaliação' });
        }
    },

        // ==================================================
    // DELETE /api/products/:productId/reviews/:reviewId
    // Remove a própria avaliação
    // ==================================================
    async delete(req, res) {
        try {
            const { productId, reviewId } = req.params;
            const userId = req.userId;

            if (isNaN(productId) || isNaN(reviewId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const result = await Review.delete(reviewId, userId);

            if (!result) {
                return res.status(404).json({ error: 'Avaliação não encontrada' });
            }

            // Recalcula rating do produto
            await Review.syncProductRating(productId);

            res.json({ message: 'Avaliação removida com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar avaliação:', error);
            res.status(500).json({ error: 'Erro ao remover avaliação' });
        }
    },
};

module.exports = reviewController;