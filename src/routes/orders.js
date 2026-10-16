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

// ⚠️ /admin/stats DEVE vir antes de /admin/:id
router.get(
    '/admin/stats',
    authenticate,
    requireAdmin,
    orderController.adminStats
);

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

router.get('/shipping/quote', orderController.shippingQuote);

router.use(authenticate);

router.get('/', orderController.listMine);
router.post('/', orderController.create);

router.get(
    '/:id',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    orderController.getById
);

router.post(
    '/:id/pay',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    orderController.pay
);

router.post(
    '/:id/cancel',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    orderController.cancel
);

module.exports = router;