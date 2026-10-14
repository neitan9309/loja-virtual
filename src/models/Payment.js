// ======================================================
// src/models/Payment.js
// ======================================================
const { pool } = require('../config/database');
const crypto = require('crypto');

const Payment = {
    // ==================================================
    // CRIAR REGISTRO DE PAGAMENTO
    // ==================================================
    async create({ order_id, method, amount, status = 'pending', gateway_response = null }) {
        const transaction_id = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        const query = `
            INSERT INTO payments (
                order_id, method, status, amount, transaction_id, gateway_response
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await pool.query(query, [
            order_id,
            method,
            status,
            amount,
            transaction_id,
            gateway_response ? JSON.stringify(gateway_response) : null,
        ]);
        return result.rows[0];
    },

    // ==================================================
    // BUSCAR POR ID
    // ==================================================
    async findById(id) {
        const result = await pool.query(
            'SELECT * FROM payments WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    // ==================================================
    // LISTAR PAGAMENTOS DE UM PEDIDO
    // ==================================================
    async findByOrder(orderId) {
        const result = await pool.query(
            'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC',
            [orderId]
        );
        return result.rows;
    },

    // ==================================================
    // MARCAR COMO PAGO
    // ==================================================
    async markAsPaid(id, gatewayResponse = null) {
        const query = `
            UPDATE payments
            SET status = 'paid',
                paid_at = CURRENT_TIMESTAMP,
                gateway_response = COALESCE($1, gateway_response)
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [
            gatewayResponse ? JSON.stringify(gatewayResponse) : null,
            id,
        ]);
        return result.rows[0] || null;
    },

    // ==================================================
    // MARCAR COMO FALHOU
    // ==================================================
    async markAsFailed(id, gatewayResponse = null) {
        const query = `
            UPDATE payments
            SET status = 'failed',
                gateway_response = COALESCE($1, gateway_response)
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [
            gatewayResponse ? JSON.stringify(gatewayResponse) : null,
            id,
        ]);
        return result.rows[0] || null;
    },

    // ==================================================
    // SIMULAR PAGAMENTO (mock)
    // Lógica:
    //  - PIX: sempre aprova (90% aprovado, 10% pendente)
    //  - Cartão: 80% aprova, 20% recusa
    //  - Boleto: sempre pendente (aguarda 1-2 dias)
    // ==================================================
    simulatePayment(method) {
        const random = Math.random();

        if (method === 'pix') {
            // 90% aprova, 10% fica pendente
            return random < 0.9 ? 'paid' : 'pending';
        }

        if (method === 'credit_card') {
            // 80% aprova, 20% recusa
            return random < 0.8 ? 'paid' : 'failed';
        }

        if (method === 'boleto') {
            // Sempre pendente (aguarda pagamento)
            return 'pending';
        }

        return 'pending';
    },
};

module.exports = Payment;