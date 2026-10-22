// ======================================================
// src/models/Address.js
// ======================================================
const { pool } = require('../config/database');

const Address = {
    // ==================================================
    // LISTAR ENDEREÇOS DO USUÁRIO
    // ==================================================
    async findByUser(userId) {
        const query = `
            SELECT * FROM user_addresses
            WHERE user_id = $1
            ORDER BY is_default DESC, created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // ==================================================
    // BUSCAR POR ID
    // ==================================================
    async findById(id, userId) {
        const query = `
            SELECT * FROM user_addresses
            WHERE id = $1 AND user_id = $2
        `;
        const result = await pool.query(query, [id, userId]);
        return result.rows[0] || null;
    },

    // ==================================================
    // CRIAR ENDEREÇO
    // ==================================================
    async create(userId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const {
                label, cep, street, number, complement,
                neighborhood, city, state, is_default
            } = data;

            // Se for o primeiro endereço ou marcado como padrão, desmarca os outros
            const countResult = await client.query(
                'SELECT COUNT(*)::int as total FROM user_addresses WHERE user_id = $1',
                [userId]
            );
            const isFirst = countResult.rows[0].total === 0;
            const shouldBeDefault = is_default || isFirst;

            if (shouldBeDefault) {
                await client.query(
                    'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                    [userId]
                );
            }

            const query = `
                INSERT INTO user_addresses (
                    user_id, label, cep, street, number, complement,
                    neighborhood, city, state, is_default
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            const values = [
                userId, label, cep, street, number, complement || null,
                neighborhood, city, state, shouldBeDefault
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ==================================================
    // ATUALIZAR ENDEREÇO
    // ==================================================
    async update(id, userId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const allowedFields = [
                'label', 'cep', 'street', 'number', 'complement',
                'neighborhood', 'city', 'state', 'is_default'
            ];
            const fields = [];
            const values = [];
            let paramCounter = 1;

            for (const field of allowedFields) {
                if (data[field] !== undefined) {
                    fields.push(`${field} = $${paramCounter}`);
                    values.push(data[field]);
                    paramCounter++;
                }
            }

            if (fields.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            // Se está definindo como padrão, desmarca os outros
            if (data.is_default === true) {
                await client.query(
                    'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                    [userId]
                );
            }

            values.push(id, userId);
            const query = `
                UPDATE user_addresses
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCounter} AND user_id = $${paramCounter + 1}
                RETURNING *
            `;
            const result = await client.query(query, values);
            await client.query('COMMIT');
            return result.rows[0] || null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ==================================================
    // DELETAR ENDEREÇO
    // ==================================================
    async delete(id, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const check = await client.query(
                'SELECT is_default FROM user_addresses WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }

            const wasDefault = check.rows[0].is_default;

            await client.query(
                'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
                [id, userId]
            );

            // Se era o padrão, promove o próximo mais recente a padrão
            if (wasDefault) {
                await client.query(`
                    UPDATE user_addresses
                    SET is_default = TRUE
                    WHERE id = (
                        SELECT id FROM user_addresses
                        WHERE user_id = $1
                        ORDER BY created_at DESC
                        LIMIT 1
                    )
                `, [userId]);
            }

            await client.query('COMMIT');
            return { removed: id };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // ==================================================
    // DEFINIR COMO PADRÃO
    // ==================================================
    async setDefault(id, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
                [userId]
            );

            const result = await client.query(
                'UPDATE user_addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, userId]
            );

            await client.query('COMMIT');
            return result.rows[0] || null;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = Address;