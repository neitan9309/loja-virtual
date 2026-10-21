// ======================================================
// src/controllers/wishlistController.js
// ======================================================
const { Wishlist } = require('../models');

const wishlistController = {
    // ==================================================
    // POST /api/wishlist
    // Body: { product_id }
    // ==================================================
    async add(req, res) {
        try {
            const userId = req.userId;
            const { product_id } = req.body;

            const productId = parseInt(product_id);
            if (!productId || isNaN(productId)) {
                return res.status(400).json({ error: 'product_id é obrigatório' });
            }

            const result = await Wishlist.add(userId, productId);

            if (result.alreadyExists) {
                return res.json({
                    message: 'Produto já está nos favoritos',
                    already_exists: true,
                });
            }

            // Retorna contador atualizado
            const count = await Wishlist.countByUser(userId);

            res.status(201).json({
                message: 'Adicionado aos favoritos',
                count,
            });
        } catch (error) {
            console.error('Erro ao adicionar aos favoritos:', error);
            if (error.status === 404) {
                return res.status(404).json({ error: error.message });
            }
            res.status(500).json({ error: 'Erro ao adicionar aos favoritos' });
        }
    },

    // ==================================================
    // DELETE /api/wishlist/:productId
    // ==================================================
    async remove(req, res) {
        try {
            const userId = req.userId;
            const productId = parseInt(req.params.productId);

            if (!productId || isNaN(productId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const result = await Wishlist.remove(userId, productId);

            if (!result.removed) {
                return res.status(404).json({ error: 'Produto não estava nos favoritos' });
            }

            const count = await Wishlist.countByUser(userId);

            res.json({
                message: 'Removido dos favoritos',
                count,
            });
        } catch (error) {
            console.error('Erro ao remover dos favoritos:', error);
            res.status(500).json({ error: 'Erro ao remover dos favoritos' });
        }
    },

    // ==================================================
    // GET /api/wishlist
    // ==================================================
    async list(req, res) {
        try {
            const userId = req.userId;
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 100), 100);
            const offset = (page - 1) * limit;

            const [items, total] = await Promise.all([
                Wishlist.findByUser(userId, { limit, offset }),
                Wishlist.countByUser(userId),
            ]);

            // Mapeia para o formato de "produto" (compatível com renderProductCard)
            const products = items.map((w) => {
                const basePrice = parseFloat(w.price);
                const discount = parseFloat(w.discount_percent || 0);
                const effectivePrice = discount > 0
                    ? basePrice * (1 - discount / 100)
                    : basePrice;

                const priceWhenAdded = parseFloat(w.price_when_added);
                // Se o preço quando adicionado era maior que o preço efetivo atual → caiu
                const priceDropped = priceWhenAdded > effectivePrice;

                return {
                    id: w.id,
                    name: w.name,
                    slug: w.slug,
                    sku: w.sku,
                    price: w.price,                        // preço base (como o catalog usa)
                    discount_percent: w.discount_percent,
                    effective_price: parseFloat(effectivePrice.toFixed(2)),   // preço com desconto
                    stock_quantity: w.stock_quantity,
                    is_active: w.is_active,
                    is_featured: w.is_featured,
                    is_new: w.is_new,
                    is_best_seller: w.is_best_seller,
                    short_description: w.short_description,
                    images: w.images || [],
                    wishlist: {
                        id: w.wishlist_id,
                        added_at: w.added_at,
                        price_when_added: priceWhenAdded,
                        price_dropped: priceDropped,
                    },
                };
            });

            res.json({
                products,
                total,
                pagination: { page, limit, offset, pages: Math.ceil(total / limit) },
            });
        } catch (error) {
            console.error('Erro ao listar favoritos:', error);
            res.status(500).json({ error: 'Erro ao buscar favoritos' });
        }
    },

    // ==================================================
    // GET /api/wishlist/count
    // ==================================================
    async count(req, res) {
        try {
            const count = await Wishlist.countByUser(req.userId);
            res.json({ count });
        } catch (error) {
            console.error('Erro ao contar favoritos:', error);
            res.status(500).json({ error: 'Erro ao contar favoritos' });
        }
    },

    // ==================================================
    // GET /api/wishlist/check/:productId
    // ==================================================
    async check(req, res) {
        try {
            const productId = parseInt(req.params.productId);
            if (!productId || isNaN(productId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const inWishlist = await Wishlist.isInWishlist(req.userId, productId);
            res.json({ in_wishlist: inWishlist });
        } catch (error) {
            console.error('Erro ao verificar favorito:', error);
            res.status(500).json({ error: 'Erro ao verificar favorito' });
        }
    },

    // ==================================================
    // GET /api/wishlist/ids
    // Lista apenas os IDs (para marcar corações em lote)
    // ==================================================
    async listIds(req, res) {
        try {
            const ids = await Wishlist.listProductIds(req.userId);
            res.json({ ids });
        } catch (error) {
            console.error('Erro ao listar IDs de favoritos:', error);
            res.status(500).json({ error: 'Erro ao listar favoritos' });
        }
    },
};

module.exports = wishlistController;