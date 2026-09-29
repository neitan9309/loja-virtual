// ======================================================
// src/models/Cart.js
// ======================================================
const { pool } = require('../config/database');

const Cart = {
    // ======================================================
    // OBTER OU CRIAR CARRINHO (race-condition safe)
    // Usa UPSERT + SELECT atômico
    // ======================================================
    async getOrCreateByUserId(userId) {
        // ✅ UPSERT: cria se não existir, ignora se já existir
        await pool.query(
            `INSERT INTO carts (user_id)
             VALUES ($1)
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        // Agora sempre existe — SELECT é seguro
        const result = await pool.query(
            'SELECT * FROM carts WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Caso raro: o user_id não existe (FK violation silenciosa)
            const err = new Error('Usuário não encontrado. Faça login novamente.');
            err.code = 'USER_NOT_FOUND';
            err.status = 401;
            throw err;
        }

        return result.rows[0];
    },

    // ======================================================
    // LISTAR ITENS DO CARRINHO
    // ======================================================
    async getItems(userId) {
        const cart = await this.getOrCreateByUserId(userId);

        const query = `
            SELECT
                ci.id,
                ci.product_id,
                ci.quantity,
                ci.created_at,
                p.name,
                p.slug,
                p.price,
                p.discount_percent,
                p.stock_quantity,
                p.is_active,
                (SELECT json_build_object(
                    'id', pi.id,
                    'url', pi.image_url,
                    'alt', pi.alt_text
                )
                FROM product_images pi
                WHERE pi.product_id = p.id
                ORDER BY pi.is_primary DESC, pi.sort_order
                LIMIT 1) as image
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.cart_id = $1
            ORDER BY ci.created_at DESC
        `;

        const result = await pool.query(query, [cart.id]);

        const items = result.rows.map((item) => {
            const originalPrice = parseFloat(item.price);
            const discount = parseFloat(item.discount_percent || 0);
            const unitPrice = discount > 0
                ? originalPrice * (1 - discount / 100)
                : originalPrice;
            const subtotal = unitPrice * item.quantity;

            return {
                ...item,
                unit_price: unitPrice,
                original_price: originalPrice,
                subtotal,
            };
        });

        const total = items.reduce((sum, item) => sum + item.subtotal, 0);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

        return {
            cart_id: cart.id,
            items,
            total,
            total_items: totalItems,
        };
    },

    // ======================================================
    // ADICIONAR ITEM (race-condition safe)
    // ======================================================
    async addItem(userId, productId, quantity = 1) {
        const cart = await this.getOrCreateByUserId(userId);

        // Verifica produto
        const productQuery = 'SELECT id, stock_quantity, is_active FROM products WHERE id = $1 AND deleted_at IS NULL';
        const productResult = await pool.query(productQuery, [productId]);

        if (productResult.rows.length === 0) {
            throw new Error('Produto não encontrado');
        }

        const product = productResult.rows[0];
        if (!product.is_active) {
            throw new Error('Produto indisponível');
        }

        // ✅ UPSERT com incremento atômico
        const query = `
            INSERT INTO cart_items (cart_id, product_id, quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (cart_id, product_id)
            DO UPDATE SET
                quantity = cart_items.quantity + EXCLUDED.quantity,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const insertResult = await pool.query(query, [cart.id, productId, quantity]);
        const newQuantity = insertResult.rows[0].quantity;

        // Verifica estoque DEPOIS do incremento
        if (newQuantity > product.stock_quantity) {
            // Reverte pra quantidade anterior
            await pool.query(
                'UPDATE cart_items SET quantity = $1 WHERE id = $2',
                [newQuantity - quantity, insertResult.rows[0].id]
            );
            throw new Error(`Estoque insuficiente. Disponível: ${product.stock_quantity}`);
        }

        return this.getItems(userId);
    },

    // ======================================================
    // ATUALIZAR QUANTIDADE
    // ======================================================
    async updateItemQuantity(userId, itemId, quantity) {
        if (quantity < 1) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        const cart = await this.getOrCreateByUserId(userId);

        const itemQuery = 'SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2';
        const itemResult = await pool.query(itemQuery, [itemId, cart.id]);

        if (itemResult.rows.length === 0) {
            throw new Error('Item não encontrado no carrinho');
        }

        const item = itemResult.rows[0];

        const productQuery = 'SELECT stock_quantity FROM products WHERE id = $1';
        const productResult = await pool.query(productQuery, [item.product_id]);

        if (productResult.rows.length > 0) {
            const stock = productResult.rows[0].stock_quantity;
            if (quantity > stock) {
                throw new Error(`Estoque insuficiente. Disponível: ${stock}`);
            }
        }

        await pool.query(`
            UPDATE cart_items
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [quantity, itemId]);

        return this.getItems(userId);
    },

    // ======================================================
    // REMOVER ITEM
    // ======================================================
    async removeItem(userId, itemId) {
        const cart = await this.getOrCreateByUserId(userId);

        const query = 'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id';
        const result = await pool.query(query, [itemId, cart.id]);

        if (result.rows.length === 0) {
            throw new Error('Item não encontrado');
        }

        return this.getItems(userId);
    },

    // ======================================================
    // LIMPAR CARRINHO
    // ======================================================
    async clear(userId) {
        const cart = await this.getOrCreateByUserId(userId);
        await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
        return this.getItems(userId);
    },

    // ======================================================
    // CONTAR ITENS
    // ======================================================
    async countItems(userId) {
        const cart = await this.getOrCreateByUserId(userId);
        const query = 'SELECT COALESCE(SUM(quantity), 0) as total FROM cart_items WHERE cart_id = $1';
        const result = await pool.query(query, [cart.id]);
        return parseInt(result.rows[0].total);
    },
};

module.exports = Cart;