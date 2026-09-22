const express = require('express');
const router = express.Router();
const { inventoryController } = require('../controllers');

// ========================
// ROTAS DE CONSULTA
// ========================

// GET /api/inventory/product/:productId - Estoque por produto
router.get('/product/:productId', inventoryController.getByProduct);

// GET /api/inventory/product/:productId/movements - Movimentações de estoque
// Query params: limit (padrão: 50)
router.get('/product/:productId/movements', inventoryController.getMovements);

// ========================
// ROTAS DE ESCRITA
// ========================

// POST /api/inventory - Criar registro de estoque
router.post('/', inventoryController.create);

// PUT /api/inventory/:id - Atualizar quantidade em estoque
router.put('/:id', inventoryController.updateQuantity);

// POST /api/inventory/:id/movement - Registrar movimentação
// Body: movement_type, quantity, reason, reference_type, reference_id, user_id, notes
router.post('/:id/movement', inventoryController.registerMovement);

module.exports = router;