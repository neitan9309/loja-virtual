// ======================================================
// src/controllers/qnaController.js
// ======================================================
const { QnA } = require('../models');
const { validationResult } = require('express-validator');

const qnaController = {
    // ==================================================
    // ROTAS PÚBLICAS
    // ==================================================
    async listByProduct(req, res) {
        try {
            const { productId } = req.params;
            if (isNaN(productId)) return res.status(400).json({ error: 'ID inválido' });

            const questions = await QnA.findByProduct(productId);
            res.json({ questions });
        } catch (error) {
            console.error('Erro ao listar perguntas:', error);
            res.status(500).json({ error: 'Erro ao buscar perguntas' });
        }
    },

    async ask(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Dados inválidos', fields: errors.array() });
        }
        try {
            const { productId } = req.params;
            const { question } = req.body;
            const userId = req.userId;

            if (isNaN(productId)) return res.status(400).json({ error: 'ID inválido' });

            const created = await QnA.createQuestion({
                product_id: parseInt(productId),
                user_id: userId,
                question: question.trim()
            });
            res.status(201).json(created);
        } catch (error) {
            console.error('Erro ao criar pergunta:', error);
            res.status(500).json({ error: 'Erro ao enviar pergunta' });
        }
    },

    // ==================================================
    // ROTAS ADMIN
    // ==================================================
    async adminList(req, res) {
        try {
            const questions = await QnA.adminList({
                q: req.query.q || '',
                status: req.query.status || 'all'
            });
            res.json(questions);
        } catch (error) {
            console.error('Erro ao listar perguntas (admin):', error);
            res.status(500).json({ error: 'Erro ao listar perguntas' });
        }
    },

    async adminGetById(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const question = await QnA.findById(id);
            if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

            res.json(question);
        } catch (error) {
            console.error('Erro ao buscar pergunta:', error);
            res.status(500).json({ error: 'Erro ao buscar pergunta' });
        }
    },

    async adminAnswer(req, res) {
        try {
            const { id } = req.params;
            const { answer } = req.body;
            const adminId = req.userId;

            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
            if (!answer || !answer.trim()) return res.status(400).json({ error: 'Resposta é obrigatória' });

            const created = await QnA.createAnswer({
                question_id: parseInt(id),
                user_id: adminId,
                answer: answer.trim()
            });
            res.status(201).json(created);
        } catch (error) {
            console.error('Erro ao responder:', error);
            res.status(500).json({ error: 'Erro ao responder pergunta' });
        }
    },

    async adminDeleteQuestion(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const result = await QnA.deleteQuestion(id);
            if (!result) return res.status(404).json({ error: 'Pergunta não encontrada' });

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao deletar pergunta:', error);
            res.status(500).json({ error: 'Erro ao deletar pergunta' });
        }
    },

    async adminDeleteAnswer(req, res) {
        try {
            const { id } = req.params;
            if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

            const result = await QnA.deleteAnswer(id);
            if (!result) return res.status(404).json({ error: 'Resposta não encontrada' });

            res.status(204).send();
        } catch (error) {
            console.error('Erro ao deletar resposta:', error);
            res.status(500).json({ error: 'Erro ao deletar resposta' });
        }
    },
};

module.exports = qnaController;