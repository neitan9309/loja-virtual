const { pool } = require('../config/database');

const Inventory = {
    // ======================================================
    // BUSCAR ESTOQUE POR PRODUTO
    // ======================================================
    async findByProductId(productId) {
        const query = `
            SELECT i.*, 
                   pv.variation_type,
                   pv.variation_value
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
        const { product_id, variation_id, quantity, min_quantity, max_quantity, location, supplier_id } = data;
        const query = `
            INSERT INTO inventory (
                product_id, variation_id, quantity, min_quantity, max_quantity, location, supplier_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            product_id, variation_id || null, quantity || 0,
            min_quantity || 5, max_quantity || null,
            location || null, supplier_id || null
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // ======================================================
    // ATUALIZAR QUANTIDADE (sincroniza com products.stock_quantity)
    // ======================================================
    async updateQuantity(id, quantity) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Atualiza inventory
            const updateInventory = await client.query(`
                UPDATE inventory 
                SET quantity = $1, last_restock_date = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `, [quantity, id]);

            if (updateInventory.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            const inventory = updateInventory.rows[0];

            // Sincroniza com products.stock_quantity
            // (só se não for uma variação específica, pois o produto guarda o total)
            await client.query(`
                UPDATE products
                SET stock_quantity = (
                    SELECT COALESCE(SUM(quantity), 0)
                    FROM inventory
                    WHERE product_id = $1
                )
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
    // REGISTRAR MOVIMENTAÇÃO (com atualização do estoque e do produto)
    // ======================================================
    async registerMovement(data) {
        const {
            product_id, variation_id, movement_type, quantity,
            previous_quantity, new_quantity, reason,
            reference_type, reference_id, user_id, notes
        } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Registra a movimentação
            const movementResult = await client.query(`
                INSERT INTO inventory_movements (
                    product_id, variation_id, movement_type, quantity,
                    previous_quantity, new_quantity, reason,
                    reference_type, reference_id, user_id, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                product_id, variation_id || null, movement_type, quantity,
                previous_quantity, new_quantity, reason || null,
                reference_type || null, reference_id || null,
                user_id || null, notes || null
            ]);

            // 2. Atualiza inventory.quantity
            await client.query(`
                UPDATE inventory 
                SET quantity = $1, 
                    last_restock_date = CASE 
                        WHEN $2 = 'in' THEN CURRENT_TIMESTAMP 
                        ELSE last_restock_date 
                    END
                WHERE product_id = $3
                  AND (variation_id = $4 OR ($4 IS NULL AND variation_id IS NULL))
            `, [new_quantity, movement_type, product_id, variation_id]);

            // 3. Sincroniza products.stock_quantity (soma de todos os inventários do produto)
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
            return movementResult.rows[0];
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
            SELECT im.*, 
                   pv.variation_type,
                   pv.variation_value
            FROM inventory_movements im
            LEFT JOIN product_variations pv ON im.variation_id = pv.id
            WHERE im.product_id = $1
            ORDER BY im.created_at DESC
            LIMIT $2
        `;
        const result = await pool.query(query, [productId, limit]);
        return result.rows;
    }
};

module.exports = Inventory;