// ======================================================
// src/routes/inventory.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { inventoryController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ======================================================
// TODAS as rotas de inventory exigem admin
// (dados sensíveis: localização, fornecedor, movimentações)
// ======================================================
router.use(authenticate, requireAdmin);

// ========================
// ROTAS DE CONSULTA
// ========================

// GET /api/inventory/product/:productId - Estoque por produto
router.get(
    '/product/:productId',
    param('productId').isInt({ min: 1 }).withMessage('ID inválido'),
    inventoryController.getByProduct
);

// GET /api/inventory/product/:productId/movements - Movimentações
router.get(
    '/product/:productId/movements',
    param('productId').isInt({ min: 1 }).withMessage('ID inválido'),
    inventoryController.getMovements
);

// ========================
// ROTAS DE ESCRITA
// ========================

// POST /api/inventory - Criar registro de estoque
router.post('/', inventoryController.create);

// PUT /api/inventory/:id - Atualizar quantidade
router.put(
    '/:id',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    inventoryController.updateQuantity
);

// POST /api/inventory/:id/movement - Registrar movimentação
router.post(
    '/:id/movement',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    inventoryController.registerMovement
);

module.exports = router;