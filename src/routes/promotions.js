// ======================================================
// src/routes/promotions.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { promotionController } = require('../controllers');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

// ======================================================
// ROTAS ADMIN (DEVEM VIR ANTES DE /:id)
// ======================================================
router.get('/admin/list', authenticate, requireAdmin, promotionController.adminList);

router.post(
    '/admin/:id/reset',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    promotionController.adminResetUsage
);

router.get(
    '/admin/:id/usages',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    promotionController.adminUsages
);

router.patch(
    '/admin/:id/toggle',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    promotionController.adminToggle
);

// ======================================================
// ROTAS PÚBLICAS
// ======================================================

// GET /api/promotions/active
router.get('/active', promotionController.active);

// GET /api/promotions/code/:code (com optionalAuth para checar se usuário usou)
router.get('/code/:code', optionalAuth, promotionController.getByCode);

// GET /api/promotions/available?subtotal=X&items=[...]
router.get('/available', optionalAuth, promotionController.availableForCart);

// GET /api/promotions
router.get('/', promotionController.list);

// GET /api/promotions/:id
router.get(
    '/:id',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    promotionController.getById
);

// ======================================================
// ROTAS ADMIN (CRUD)
// ======================================================
router.post('/', authenticate, requireAdmin, promotionController.create);

router.put(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    promotionController.update
);

router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    promotionController.delete
);

module.exports = router;