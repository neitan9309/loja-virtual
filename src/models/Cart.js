const { pool } = require('../config/database');

const Cart = {
    // ==================================================
    // OBTER OU CRIAR CARRINHO DO USUÁRIO
    // ==================================================
    async getOrCreateByUserId(userId) {
        // Tenta buscar
        let query = 'SELECT * FROM carts WHERE user_id = $1';
        let result = await pool.query(query, [userId]);

        if (result.rows.length > 0) {
            return result.rows[0];
        }

        // Cria novo
        try {
            query = 'INSERT INTO carts (user_id) VALUES ($1) RETURNING *';
            result = await pool.query(query, [userId]);
            return result.rows[0];
        } catch (error) {
            // ✅ Se o user_id não existe na tabela users, retorna erro claro
            if (error.code === '23503') {
                const customError = new Error('Usuário não encontrado. Faça login novamente.');
                customError.code = 'USER_NOT_FOUND';
                customError.status = 401;
                throw customError;
            }
            throw error;
        }
    },

    // ==================================================
    // LISTAR ITENS DO CARRINHO
    // ==================================================
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

        // Calcula subtotal, total, etc.
        const items = result.rows.map(item => {
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
                subtotal
            };
        });

        const total = items.reduce((sum, item) => sum + item.subtotal, 0);
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

        return {
            cart_id: cart.id,
            items,
            total,
            total_items: totalItems
        };
    },

    // ==================================================
    // ADICIONAR ITEM
    // ==================================================
    async addItem(userId, productId, quantity = 1) {
        const cart = await this.getOrCreateByUserId(userId);

        // Verifica se produto existe e está ativo
        const productQuery = 'SELECT id, stock_quantity, is_active FROM products WHERE id = $1 AND deleted_at IS NULL';
        const productResult = await pool.query(productQuery, [productId]);

        if (productResult.rows.length === 0) {
            throw new Error('Produto não encontrado');
        }

        const product = productResult.rows[0];
        if (!product.is_active) {
            throw new Error('Produto indisponível');
        }

        // Verifica se já está no carrinho
        const existingQuery = 'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2';
        const existing = await pool.query(existingQuery, [cart.id, productId]);

        let newQuantity;

        if (existing.rows.length > 0) {
            newQuantity = existing.rows[0].quantity + quantity;
        } else {
            newQuantity = quantity;
        }

        // Verifica estoque
        if (newQuantity > product.stock_quantity) {
            throw new Error(`Estoque insuficiente. Disponível: ${product.stock_quantity}`);
        }

        // Insere ou atualiza
        if (existing.rows.length > 0) {
            const updateQuery = `
                UPDATE cart_items 
                SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
                RETURNING *
            `;
            await pool.query(updateQuery, [newQuantity, existing.rows[0].id]);
        } else {
            const insertQuery = `
                INSERT INTO cart_items (cart_id, product_id, quantity)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            await pool.query(insertQuery, [cart.id, productId, quantity]);
        }

        return this.getItems(userId);
    },

    // ==================================================
    // ATUALIZAR QUANTIDADE
    // ==================================================
    async updateItemQuantity(userId, itemId, quantity) {
        if (quantity < 1) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        const cart = await this.getOrCreateByUserId(userId);

        // Verifica se o item pertence ao carrinho do usuário
        const itemQuery = 'SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2';
        const itemResult = await pool.query(itemQuery, [itemId, cart.id]);

        if (itemResult.rows.length === 0) {
            throw new Error('Item não encontrado no carrinho');
        }

        const item = itemResult.rows[0];

        // Verifica estoque
        const productQuery = 'SELECT stock_quantity FROM products WHERE id = $1';
        const productResult = await pool.query(productQuery, [item.product_id]);

        if (productResult.rows.length > 0) {
            const stock = productResult.rows[0].stock_quantity;
            if (quantity > stock) {
                throw new Error(`Estoque insuficiente. Disponível: ${stock}`);
            }
        }

        const updateQuery = `
            UPDATE cart_items 
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
            RETURNING *
        `;
        await pool.query(updateQuery, [quantity, itemId]);

        return this.getItems(userId);
    },

    // ==================================================
    // REMOVER ITEM
    // ==================================================
    async removeItem(userId, itemId) {
        const cart = await this.getOrCreateByUserId(userId);

        const query = 'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id';
        const result = await pool.query(query, [itemId, cart.id]);

        if (result.rows.length === 0) {
            throw new Error('Item não encontrado');
        }

        return this.getItems(userId);
    },

    // ==================================================
    // LIMPAR CARRINHO
    // ==================================================
    async clear(userId) {
        const cart = await this.getOrCreateByUserId(userId);
        await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cart.id]);
        return this.getItems(userId);
    },

    // ==================================================
    // CONTAR ITENS (para o badge do header)
    // ==================================================
    async countItems(userId) {
        const cart = await this.getOrCreateByUserId(userId);
        const query = 'SELECT COALESCE(SUM(quantity), 0) as total FROM cart_items WHERE cart_id = $1';
        const result = await pool.query(query, [cart.id]);
        return parseInt(result.rows[0].total);
    }
};

module.exports = Cart;