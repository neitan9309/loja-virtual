const { Inventory, Product } = require('../models');

const inventoryController = {
    // ======================================================
    // ESTOQUE POR PRODUTO
    // ======================================================
    async getByProduct(req, res) {
        try {
            const { productId } = req.params;

            if (isNaN(productId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: 'Produto não encontrado' });
            }

            const inventory = await Inventory.findByProductId(productId);
            res.json(inventory);
        } catch (error) {
            console.error('Erro ao buscar estoque:', error);
            res.status(500).json({ error: 'Erro ao buscar estoque' });
        }
    },

    // ======================================================
    // MOVIMENTAÇÕES DE ESTOQUE
    // ======================================================
    async getMovements(req, res) {
        try {
            const { productId } = req.params;
            const limit = parseInt(req.query.limit) || 50;

            if (isNaN(productId)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            const movements = await Inventory.getMovementsByProduct(productId, limit);
            res.json(movements);
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error);
            res.status(500).json({ error: 'Erro ao buscar movimentações' });
        }
    },

    // ======================================================
    // CRIAR REGISTRO DE ESTOQUE
    // ======================================================
    async create(req, res) {
        try {
            const { product_id, quantity } = req.body;

            if (!product_id || quantity === undefined) {
                return res.status(400).json({ 
                    error: 'Campos obrigatórios: product_id, quantity' 
                });
            }

            const inventory = await Inventory.create(req.body);

            // Sincroniza products.stock_quantity
            await Inventory.updateQuantity(inventory.id, inventory.quantity);

            // Busca o valor atualizado
            const updated = await Inventory.findByProductAndVariation(
                inventory.product_id, 
                inventory.variation_id
            );

            res.status(201).json(updated);
        } catch (error) {
            console.error('Erro ao criar estoque:', error);

            if (error.code === '23503') {
                return res.status(400).json({ 
                    error: 'Produto ou variação inválida' 
                });
            }

            res.status(500).json({ error: 'Erro ao criar estoque' });
        }
    },

    // ======================================================
    // ATUALIZAR QUANTIDADE EM ESTOQUE
    // ======================================================
    async updateQuantity(req, res) {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            if (quantity === undefined || quantity < 0) {
                return res.status(400).json({ 
                    error: 'Quantidade deve ser um número positivo' 
                });
            }

            const inventory = await Inventory.updateQuantity(id, quantity);

            if (!inventory) {
                return res.status(404).json({ error: 'Estoque não encontrado' });
            }

            res.json(inventory);
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            res.status(500).json({ error: 'Erro ao atualizar estoque' });
        }
    },

    // ======================================================
    // REGISTRAR MOVIMENTAÇÃO
    // ======================================================
    async registerMovement(req, res) {
        try {
            const { id } = req.params;
            const {
                movement_type, quantity, reason,
                reference_type, reference_id, user_id, notes
            } = req.body;

            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID inválido' });
            }

            // Validações
            const validTypes = ['in', 'out', 'adjustment', 'return'];
            if (!validTypes.includes(movement_type)) {
                return res.status(400).json({ 
                    error: 'movement_type deve ser: in, out, adjustment ou return' 
                });
            }

            if (!quantity || quantity <= 0) {
                return res.status(400).json({ 
                    error: 'Quantidade deve ser maior que zero' 
                });
            }

            // Busca estoque atual pelo ID do inventory
            const client = await require('../config/database').pool.connect();
            let inventory;
            try {
                const result = await client.query(
                    'SELECT * FROM inventory WHERE id = $1',
                    [id]
                );
                inventory = result.rows[0];
            } finally {
                client.release();
            }

            if (!inventory) {
                return res.status(404).json({ error: 'Estoque não encontrado' });
            }

            const previousQuantity = inventory.quantity;
            let newQuantity;

            if (movement_type === 'in' || movement_type === 'return') {
                newQuantity = previousQuantity + quantity;
            } else if (movement_type === 'out') {
                if (quantity > previousQuantity) {
                    return res.status(400).json({ 
                        error: 'Quantidade insuficiente em estoque',
                        available: previousQuantity
                    });
                }
                newQuantity = previousQuantity - quantity;
            } else { // adjustment
                newQuantity = quantity;
            }

            // Registra movimentação (já atualiza inventory e products.stock_quantity)
            const movement = await Inventory.registerMovement({
                product_id: inventory.product_id,
                variation_id: inventory.variation_id,
                movement_type,
                quantity,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                reason,
                reference_type,
                reference_id,
                user_id,
                notes
            });

            // Busca o produto atualizado para retornar o novo stock_quantity
            const product = await Product.findById(inventory.product_id);

            res.status(201).json({
                movement,
                current_stock: newQuantity,
                product_stock_quantity: product.stock_quantity
            });
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
            res.status(500).json({ error: 'Erro ao registrar movimentação' });
        }
    }
};

module.exports = inventoryController;