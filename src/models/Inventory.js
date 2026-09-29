// ======================================================
// src/models/Inventory.js
// ======================================================
const { pool } = require('../config/database');

const Inventory = {
    // ======================================================
    // BUSCAR ESTOQUE POR PRODUTO
    // ======================================================
    async findByProductId(productId) {
        const query = `
            SELECT i.*, pv.variation_type, pv.variation_value
            FROM inventory i
            LEFT JOIN product_variations pv ON i.variation_id = pv.id
            WHERE i.product_id = $1
        `;
        const result = await pool.query(query, [productId]);
        return result.rows;
    },

    // ======================================================
    // BUSCAR ESTOQUE POR PRODUTO E VARIAÇÃO
    // ======================================================
    async findByProductAndVariation(productId, variationId = null) {
        const query = `
            SELECT * FROM inventory
            WHERE product_id = $1
              AND (variation_id = $2 OR ($2 IS NULL AND variation_id IS NULL))
        `;
        const result = await pool.query(query, [productId, variationId]);
        return result.rows[0] || null;
    },

    // ======================================================
    // CRIAR REGISTRO DE ESTOQUE
    // ======================================================
    async create(data) {
        const {
            product_id,
            variation_id,
            quantity,
            min_quantity,
            max_quantity,
            location,
            supplier_id,
        } = data;

        const query = `
            INSERT INTO inventory (
                product_id, variation_id, quantity, min_quantity, max_quantity, location, supplier_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            product_id,
            variation_id || null,
            quantity || 0,
            min_quantity || 5,
            max_quantity || null,
            location || null,
            supplier_id || null,
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // ======================================================
    // ATUALIZAR QUANTIDADE (com lock + sincronização)
    // ======================================================
    async updateQuantity(id, quantity) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 🔒 Lock pessimista na linha
            const lockResult = await client.query(
                'SELECT * FROM inventory WHERE id = $1 FOR UPDATE',
                [id]
            );

            if (lockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            // Atualiza inventory
            const updateResult = await client.query(`
                UPDATE inventory
                SET quantity = $1, last_restock_date = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `, [quantity, id]);

            const inventory = updateResult.rows[0];

            // Sincroniza products.stock_quantity
            await client.query(`
                UPDATE products
                SET stock_quantity = (
                    SELECT COALESCE(SUM(quantity), 0)
                    FROM inventory
                    WHERE product_id = $1
                ),
                stock_status = CASE
                    WHEN (SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = $1) > 0
                    THEN 'in_stock'
                    ELSE 'out_of_stock'
                END
                WHERE id = $1
            `, [inventory.product_id]);

            await client.query('COMMIT');
            return inventory;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ======================================================
    // REGISTRAR MOVIMENTAÇÃO (com lock — resolve race condition)
    // Calcula previous_quantity e new_quantity dentro da transação
    // ======================================================
    async registerMovement(data) {
        const {
            product_id,
            variation_id = null,
            movement_type,
            quantity,
            reason,
            reference_type,
            reference_id,
            user_id,
            notes,
        } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 🔒 Lock pessimista na linha de estoque
            const lockResult = await client.query(
                `SELECT * FROM inventory
                 WHERE product_id = $1
                   AND (variation_id = $2 OR ($2 IS NULL AND variation_id IS NULL))
                 FOR UPDATE`,
                [product_id, variation_id]
            );

            if (lockResult.rows.length === 0) {
                const err = new Error('Estoque não encontrado');
                err.status = 404;
                throw err;
            }

            const inventory = lockResult.rows[0];
            const previousQuantity = inventory.quantity;

            // Calcula nova quantidade
            let newQuantity;
            if (movement_type === 'in' || movement_type === 'return') {
                newQuantity = previousQuantity + quantity;
            } else if (movement_type === 'out') {
                if (quantity > previousQuantity) {
                    const err = new Error('Quantidade insuficiente em estoque');
                    err.status = 400;
                    err.available = previousQuantity;
                    throw err;
                }
                newQuantity = previousQuantity - quantity;
            } else {
                // adjustment
                newQuantity = quantity;
            }

            // 1. Registra movimentação
            const movementResult = await client.query(`
                INSERT INTO inventory_movements (
                    product_id, variation_id, movement_type, quantity,
                    previous_quantity, new_quantity, reason,
                    reference_type, reference_id, user_id, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                product_id,
                variation_id,
                movement_type,
                quantity,
                previousQuantity,
                newQuantity,
                reason || null,
                reference_type || null,
                reference_id || null,
                user_id || null,
                notes || null,
            ]);

            // 2. Atualiza inventory.quantity
            await client.query(`
                UPDATE inventory
                SET quantity = $1,
                    last_restock_date = CASE
                        WHEN $2 = 'in' THEN CURRENT_TIMESTAMP
                        ELSE last_restock_date
                    END
                WHERE id = $3
            `, [newQuantity, movement_type, inventory.id]);

            // 3. Sincroniza products.stock_quantity
            await client.query(`
                UPDATE products
                SET stock_quantity = (
                    SELECT COALESCE(SUM(quantity), 0)
                    FROM inventory
                    WHERE product_id = $1
                ),
                stock_status = CASE
                    WHEN (SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE product_id = $1) > 0
                    THEN 'in_stock'
                    ELSE 'out_of_stock'
                END
                WHERE id = $1
            `, [product_id]);

            await client.query('COMMIT');

            return {
                movement: movementResult.rows[0],
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ======================================================
    // MOVIMENTAÇÕES POR PRODUTO
    // ======================================================
    async getMovementsByProduct(productId, limit = 50) {
        const query = `
            SELECT im.*, pv.variation_type, pv.variation_value
            FROM inventory_movements im
            LEFT JOIN product_variations pv ON im.variation_id = pv.id
            WHERE im.product_id = $1
            ORDER BY im.created_at DESC
            LIMIT $2
        `;
        const result = await pool.query(query, [productId, limit]);
        return result.rows;
    },
};

module.exports = Inventory;