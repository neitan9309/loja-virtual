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

            const lockResult = await client.query(
                'SELECT * FROM inventory WHERE id = $1 FOR UPDATE',
                [id]
            );

            if (lockResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            const updateResult = await client.query(`
                UPDATE inventory
                SET quantity = $1, last_restock_date = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `, [quantity, id]);

            const inventory = updateResult.rows[0];

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
                newQuantity = quantity;
            }

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

            await client.query(`
                UPDATE inventory
                SET quantity = $1,
                    last_restock_date = CASE
                        WHEN $2 = 'in' THEN CURRENT_TIMESTAMP
                        ELSE last_restock_date
                    END
                WHERE id = $3
            `, [newQuantity, movement_type, inventory.id]);

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

    // ======================================================
    // MOVIMENTAÇÕES RECENTES (todos os produtos)
    // ======================================================
    async getRecentMovements(limit = 10) {
        const query = `
            SELECT
                im.id,
                im.product_id,
                im.movement_type,
                im.quantity,
                im.previous_quantity,
                im.new_quantity,
                im.reason,
                im.reference_type,
                im.reference_id,
                im.created_at,
                p.name as product_name,
                p.sku as product_sku
            FROM inventory_movements im
            INNER JOIN products p ON p.id = im.product_id
            ORDER BY im.created_at DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    },

    // ======================================================
    // [NOVO] BUSCAR MOVIMENTAÇÃO POR ID (com produto + usuário)
    // ======================================================
    async findMovementById(movementId) {
        const query = `
            SELECT
                im.*,
                p.name AS product_name,
                p.slug AS product_slug,
                p.sku AS product_sku,
                u.full_name AS user_name,
                u.email AS user_email
            FROM inventory_movements im
            INNER JOIN products p ON p.id = im.product_id
            LEFT JOIN users u ON u.id = im.user_id
            WHERE im.id = $1
        `;
        const result = await pool.query(query, [movementId]);
        return result.rows[0] || null;
    },

    // ======================================================
    // [NOVO] CONTAR MOVIMENTAÇÕES COM FILTROS
    // ======================================================
// ======================================================
// src/models/Inventory.js — SOMENTE O MÉTODO countMovements
// ======================================================
    async countMovements({ type, from, to, q, product_name } = {}) {
        const conditions = ['1=1'];
        const params = [];
        let p = 1;

        if (type && ['in', 'out', 'adjustment', 'return'].includes(type)) {
            conditions.push(`im.movement_type = $${p++}`);
            params.push(type);
        }
        if (from) {
            conditions.push(`im.created_at >= $${p++}`);
            params.push(from);
        }
        if (to) {
            conditions.push(`im.created_at <= $${p++}`);
            params.push(to);
        }
        if (q && q.trim()) {
            conditions.push(`(p.name ILIKE $${p} OR p.sku ILIKE $${p})`);
            params.push(`%${q.trim()}%`);
            p++;
        }
        if (product_name && product_name.trim()) {
            conditions.push(`p.name ILIKE $${p++}`);
            params.push(`%${product_name.trim()}%`);
        }

        const query = `
            SELECT COUNT(*)::int AS total
            FROM inventory_movements im
            INNER JOIN products p ON p.id = im.product_id
            WHERE ${conditions.join(' AND ')}
        `;
        const result = await pool.query(query, params);
        return result.rows[0].total;
    },

    // ======================================================
    // [NOVO] LISTAR MOVIMENTAÇÕES COM FILTROS E PAGINAÇÃO
    // ======================================================
// ======================================================
// src/models/Inventory.js — SOMENTE O MÉTODO getMovementsList
// ======================================================
    async getMovementsList({
        limit = 20,
        offset = 0,
        type = null,
        from = null,
        to = null,
        sort = null,
        order = 'desc',
        q = '',
        product_name = '',
    } = {}) {
        const conditions = ['1=1'];
        const params = [];
        let p = 1;

        if (type && ['in', 'out', 'adjustment', 'return'].includes(type)) {
            conditions.push(`im.movement_type = $${p++}`);
            params.push(type);
        }
        if (from) {
            conditions.push(`im.created_at >= $${p++}`);
            params.push(from);
        }
        if (to) {
            conditions.push(`im.created_at <= $${p++}`);
            params.push(to);
        }
        if (q && q.trim()) {
            conditions.push(`(p.name ILIKE $${p} OR p.sku ILIKE $${p})`);
            params.push(`%${q.trim()}%`);
            p++;
        }
        if (product_name && product_name.trim()) {
            conditions.push(`p.name ILIKE $${p++}`);
            params.push(`%${product_name.trim()}%`);
        }

        // ---------- Ordenação por coluna (whitelist) ----------
        const sortMap = {
            id: 'im.id',
            created_at: 'im.created_at',
            movement_type: 'im.movement_type',
            product_name: 'p.name',
            quantity: 'im.quantity',
            previous_quantity: 'im.previous_quantity',
            new_quantity: 'im.new_quantity',
            reason: 'im.reason',
        };
        const sortField = sortMap[sort];
        const sortOrder = order && order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const orderBy = sortField ? `${sortField} ${sortOrder}` : 'im.created_at DESC';

        const query = `
            SELECT
                im.id, im.product_id, im.movement_type, im.quantity,
                im.previous_quantity, im.new_quantity, im.reason,
                im.reference_type, im.reference_id, im.created_at,
                p.name AS product_name,
                p.slug AS product_slug,
                p.sku AS product_sku
            FROM inventory_movements im
            INNER JOIN products p ON p.id = im.product_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY ${orderBy}
            LIMIT $${p} OFFSET $${p + 1}
        `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    },

// ... (resto do arquivo é idêntico)
};

module.exports = Inventory;