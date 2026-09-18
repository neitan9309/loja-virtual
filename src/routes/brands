const express = require('express');
const router = express.Router();
const { brandController } = require('../controllers');

// ========================
// ROTAS PÚBLICAS
// ========================

// GET /api/brands - Listar todas as marcas
// Query params: include_inactive (true/false)
router.get('/', brandController.list);

// GET /api/brands/slug/:slug - Buscar marca por slug
router.get('/slug/:slug', brandController.getBySlug);

// GET /api/brands/:id - Buscar marca por ID
router.get('/:id', brandController.getById);

// ========================
// ROTAS ADMINISTRATIVAS
// ========================

// POST /api/brands - Criar nova marca
router.post('/', brandController.create);

// PUT /api/brands/:id - Atualizar marca
router.put('/:id', brandController.update);

// DELETE /api/brands/:id - Remover marca
router.delete('/:id', brandController.delete);

module.exports = router;