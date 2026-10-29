// ======================================================
// src/models/QnA.js
// ======================================================
const { pool } = require('../config/database');

const QnA = {
    // ==================================================
    // LISTAR PERGUNTAS DE UM PRODUTO (público)
    // ==================================================
    async findByProduct(productId) {
        const query = `
            SELECT
                pq.id, pq.question, pq.created_at, pq.is_answered,
                u.full_name AS user_name,
                (SELECT json_agg(json_build_object(
                    'id', pa.id,
                    'answer', pa.answer,
                    'created_at', pa.created_at,
                    'admin_name', (SELECT full_name FROM users WHERE id = pa.user_id)
                ) ORDER BY pa.created_at ASC)
                FROM product_answers pa
                WHERE pa.question_id = pq.id AND pa.is_approved = TRUE) AS answers
            FROM product_questions pq
            INNER JOIN users u ON u.id = pq.user_id
            WHERE pq.product_id = $1 AND pq.is_public = TRUE
            ORDER BY pq.created_at DESC
        `;
        const result = await pool.query(query, [productId]);
        return result.rows;
    },

    // ==================================================
    // CRIAR PERGUNTA (público)
    // ==================================================
    async createQuestion({ product_id, user_id, question }) {
        const query = `
            INSERT INTO product_questions (product_id, user_id, question)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(query, [product_id, user_id, question]);
        return result.rows[0];
    },

    // ==================================================
    // LISTAR TODAS AS PERGUNTAS (admin)
    // ==================================================
    async adminList({ q = '', status = 'all' } = {}) {
        const conditions = ['1=1'];
        const params = [];
        let p = 1;

        if (q) {
            conditions.push(`(p.name ILIKE $${p} OR pq.question ILIKE $${p})`);
            params.push(`%${q}%`);
            p++;
        }
        if (status === 'unanswered') { conditions.push('pq.is_answered = FALSE'); }
        else if (status === 'answered') { conditions.push('pq.is_answered = TRUE'); }

        const query = `
            SELECT
                pq.id, pq.question, pq.created_at, pq.is_answered,
                p.name AS product_name, p.slug AS product_slug,
                u.full_name AS user_name,
                (SELECT COUNT(*) FROM product_answers pa WHERE pa.question_id = pq.id AND pa.is_approved = TRUE)::int AS answers_count
            FROM product_questions pq
            INNER JOIN products p ON p.id = pq.product_id
            INNER JOIN users u ON u.id = pq.user_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY pq.created_at DESC
        `;
        const result = await pool.query(query, params);
        return result.rows;
    },

    // ==================================================
    // BUSCAR PERGUNTA POR ID (admin, com respostas)
    // ==================================================
    async findById(id) {
        const query = `
            SELECT
                pq.*,
                p.name AS product_name, p.slug AS product_slug,
                u.full_name AS user_name, u.email AS user_email,
                (SELECT json_agg(json_build_object(
                    'id', pa.id,
                    'answer', pa.answer,
                    'is_approved', pa.is_approved,
                    'created_at', pa.created_at,
                    'admin_name', (SELECT full_name FROM users WHERE id = pa.user_id)
                ) ORDER BY pa.created_at ASC)
                FROM product_answers pa
                WHERE pa.question_id = pq.id) AS answers
            FROM product_questions pq
            INNER JOIN products p ON p.id = pq.product_id
            INNER JOIN users u ON u.id = pq.user_id
            WHERE pq.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // RESPONDER PERGUNTA (admin)
    // ==================================================
    async createAnswer({ question_id, user_id, answer }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const query = `
                INSERT INTO product_answers (question_id, user_id, answer, is_approved)
                VALUES ($1, $2, $3, TRUE)
                RETURNING *
            `;
            const result = await client.query(query, [question_id, user_id, answer]);
            await client.query('UPDATE product_questions SET is_answered = TRUE WHERE id = $1', [question_id]);
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
    // DELETAR PERGUNTA (admin)
    // ==================================================
    async deleteQuestion(id) {
        const query = 'DELETE FROM product_questions WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    // ==================================================
    // DELETAR RESPOSTA (admin)
    // ==================================================
    async deleteAnswer(id) {
        const query = 'DELETE FROM product_answers WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },
};

module.exports = QnA;