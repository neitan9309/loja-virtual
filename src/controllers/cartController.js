const Cart = require('../models/Cart');

// ==================================================
// HELPER: trata erros específicos do carrinho
// ==================================================
function handleCartError(error, res, defaultMessage) {
    // Usuário não existe mais no banco (token órfão)
    if (error.code === 'USER_NOT_FOUND') {
        return res.status(401).json({
            error: error.message,
            code: 'USER_NOT_FOUND'
        });
    }

    console.error(`${defaultMessage}:`, error);
    return res.status(500).json({ error: defaultMessage });
}

const cartController = {
    // ==================================================
    // GET /api/cart
    // ==================================================
    async getCart(req, res) {
        try {
            const cart = await Cart.getItems(req.userId);
            res.json(cart);
        } catch (error) {
            handleCartError(error, res, 'Erro ao buscar carrinho');
        }
    },

    // ==================================================
    // GET /api/cart/count
    // ==================================================
    async getCount(req, res) {
        try {
            const count = await Cart.countItems(req.userId);
            res.json({ count });
        } catch (error) {
            handleCartError(error, res, 'Erro ao contar itens');
        }
    },

    // ==================================================
    // POST /api/cart
    // Body: { product_id, quantity }
    // ==================================================
    async addItem(req, res) {
        try {
            const { product_id, quantity = 1 } = req.body;

            if (!product_id) {
                return res.status(400).json({ error: 'product_id é obrigatório' });
            }

            const qty = parseInt(quantity);
            if (isNaN(qty) || qty < 1) {
                return res.status(400).json({ error: 'Quantidade inválida' });
            }

            const cart = await Cart.addItem(req.userId, product_id, qty);
            res.status(201).json({
                message: 'Item adicionado ao carrinho',
                cart
            });
        } catch (error) {
            // Erros de negócio retornam 400
            if (error.message && !error.code) {
                return res.status(400).json({ error: error.message });
            }
            handleCartError(error, res, 'Erro ao adicionar item');
        }
    },

    // ==================================================
    // PUT /api/cart/:id
    // Body: { quantity }
    // ==================================================
    async updateItem(req, res) {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const qty = parseInt(quantity);
            if (isNaN(qty) || qty < 1) {
                return res.status(400).json({ error: 'Quantidade inválida' });
            }

            const cart = await Cart.updateItemQuantity(req.userId, id, qty);
            res.json({
                message: 'Quantidade atualizada',
                cart
            });
        } catch (error) {
            if (error.message && !error.code) {
                return res.status(400).json({ error: error.message });
            }
            handleCartError(error, res, 'Erro ao atualizar item');
        }
    },

    // ==================================================
    // DELETE /api/cart/:id
    // ==================================================
    async removeItem(req, res) {
        try {
            const { id } = req.params;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const cart = await Cart.removeItem(req.userId, id);
            res.json({
                message: 'Item removido do carrinho',
                cart
            });
        } catch (error) {
            if (error.message && !error.code) {
                return res.status(400).json({ error: error.message });
            }
            handleCartError(error, res, 'Erro ao remover item');
        }
    },

    // ==================================================
    // DELETE /api/cart
    // ==================================================
    async clearCart(req, res) {
        try {
            const cart = await Cart.clear(req.userId);
            res.json({
                message: 'Carrinho esvaziado',
                cart
            });
        } catch (error) {
            handleCartError(error, res, 'Erro ao esvaziar carrinho');
        }
    }
};

module.exports = cartController;