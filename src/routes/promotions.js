const express = require('express');
const router = express.Router();
const { promotionController } = require('../controllers');

// ========================
// ROTAS PÚBLICAS
// ========================

// GET /api/promotions/active - Promoções ativas no momento
// (deve vir antes de /:id para não conflitar)
router.get('/active', promotionController.active);

// GET /api/promotions/code/:code - Validar cupom por código
// (deve vir antes de /:id para não conflitar)
router.get('/code/:code', promotionController.getByCode);

// GET /api/promotions - Listar todas as promoções
router.get('/', promotionController.list);

// GET /api/promotions/:id - Buscar promoção por ID
router.get('/:id', promotionController.getById);

// ========================
// ROTAS ADMINISTRATIVAS
// ========================

// POST /api/promotions - Criar nova promoção
router.post('/', promotionController.create);

// PUT /api/promotions/:id - Atualizar promoção
router.put('/:id', promotionController.update);

// DELETE /api/promotions/:id - Remover promoção
router.delete('/:id', promotionController.delete);

module.exports = router;