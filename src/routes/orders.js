// ======================================================
// src/routes/orders.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const { orderController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ======================================================
// ROTAS ADMIN (devem vir antes de /:id)
// ======================================================

router.get(
    '/admin/list',
    authenticate,
    requireAdmin,
    orderController.adminList
);

router.get(
    '/admin/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    orderController.adminGetById
);

router.patch(
    '/admin/:id/status',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    body('status').notEmpty().withMessage('Status é obrigatório'),
    orderController.adminUpdateStatus
);

// ======================================================
// ROTAS PÚBLICAS (com auth)
// ======================================================

// Cálculo de frete (não exige auth — qualquer um pode consultar)
router.get('/shipping/quote', orderController.shippingQuote);

// Todas as rotas abaixo exigem login
router.use(authenticate);

// Listar meus pedidos
router.get('/', orderController.listMine);

// Criar pedido
router.post('/', orderController.create);

// Detalhe do pedido
router.get(
    '/:id',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    orderController.getById
);

// Pagar pedido
router.post(
    '/:id/pay',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    orderController.pay
);

// Cancelar pedido
router.post(
    '/:id/cancel',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    orderController.cancel
);

module.exports = router;