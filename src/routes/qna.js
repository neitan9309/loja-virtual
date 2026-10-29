// ======================================================
// src/routes/qna.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const { qnaController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ======================================================
// ROTAS PÚBLICAS
// ======================================================
router.get('/product/:productId', qnaController.listByProduct);

router.post(
    '/product/:productId',
    authenticate,
    param('productId').isInt({ min: 1 }).withMessage('ID inválido'),
    body('question').trim().isLength({ min: 5, max: 1000 }).withMessage('Pergunta deve ter entre 5 e 1000 caracteres'),
    qnaController.ask
);

// ======================================================
// ROTAS ADMIN
// ======================================================
router.get('/admin/list', authenticate, requireAdmin, qnaController.adminList);
router.get('/admin/:id', authenticate, requireAdmin, qnaController.adminGetById);
router.post(
    '/admin/:id/answer',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }),
    body('answer').trim().notEmpty().withMessage('Resposta é obrigatória'),
    qnaController.adminAnswer
);
router.delete('/admin/question/:id', authenticate, requireAdmin, qnaController.adminDeleteQuestion);
router.delete('/admin/answer/:id', authenticate, requireAdmin, qnaController.adminDeleteAnswer);

module.exports = router;