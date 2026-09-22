const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const User = {
    // ==================================================
    // CRIAR USUÁRIO
    // ==================================================
    async create(data) {
        const {
            full_name, email, password, birth_date, gender, phone, cpf,
            cep, street, number, complement, neighborhood, city, state
        } = data;

        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const query = `
            INSERT INTO users (
                full_name, email, password_hash, birth_date, gender, phone, cpf,
                cep, street, number, complement, neighborhood, city, state
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            )
            RETURNING id, full_name, email, birth_date, gender, phone, cpf,
                      cep, street, number, complement, neighborhood, city, state,
                      is_active, email_verified, created_at
        `;

        const values = [
            full_name,
            email.toLowerCase().trim(),
            password_hash,
            birth_date || null,
            gender || null,
            phone || null,
            cpf || null,
            cep || null,
            street || null,
            number || null,
            complement || null,
            neighborhood || null,
            city || null,
            state || null
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // ==================================================
    // BUSCAR POR EMAIL (com senha, para login)
    // ==================================================
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
        const result = await pool.query(query, [email.toLowerCase().trim()]);
        return result.rows[0] || null;
    },

    // ==================================================
    // BUSCAR POR ID (sem senha, para perfil)
    // ==================================================
    async findById(id) {
        const query = `
            SELECT id, full_name, email, birth_date, gender, phone, cpf,
                   cep, street, number, complement, neighborhood, city, state,
                   is_active, email_verified, last_login_at, created_at, updated_at
            FROM users
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // ATUALIZAR PERFIL
    // ==================================================
    async update(id, data) {
        const allowedFields = [
            'full_name', 'birth_date', 'gender', 'phone', 'cpf',
            'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'
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

        if (fields.length === 0) return null;

        values.push(id);
        const query = `
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = $${paramCounter}
            RETURNING id, full_name, email, birth_date, gender, phone, cpf,
                      cep, street, number, complement, neighborhood, city, state,
                      is_active, email_verified, created_at, updated_at
        `;

        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    // ==================================================
    // ATUALIZAR SENHA
    // ==================================================
    async updatePassword(id, newPassword) {
        const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        const query = 'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id';
        const result = await pool.query(query, [password_hash, id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // VERIFICAR SENHA
    // ==================================================
    async verifyPassword(plainPassword, hash) {
        return bcrypt.compare(plainPassword, hash);
    },

    // ==================================================
    // REGISTRAR LOGIN
    // ==================================================
    async registerLogin(userId) {
        await pool.query(
            'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
            [userId]
        );
    },

    // ==================================================
    // SALVAR SESSÃO
    // ==================================================
    async saveSession({ user_id, token, user_agent, ip_address, expires_at }) {
        const query = `
            INSERT INTO user_sessions (user_id, token, user_agent, ip_address, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;
        const result = await pool.query(query, [user_id, token, user_agent, ip_address, expires_at]);
        return result.rows[0];
    },

    // ==================================================
    // DELETAR SESSÃO (logout)
    // ==================================================
    async deleteSession(token) {
        await pool.query('DELETE FROM user_sessions WHERE token = $1', [token]);
    }
};

module.exports = User;