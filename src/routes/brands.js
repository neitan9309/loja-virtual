// ======================================================
// src/routes/brands.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { brandController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ======================================================
// ROTAS PÚBLICAS
// ======================================================

// GET /api/brands - Listar todas as marcas
// Query params: include_inactive (true/false)
router.get('/', brandController.list);

// GET /api/brands/slug/:slug - Buscar marca por slug
router.get('/slug/:slug', brandController.getBySlug);

// GET /api/brands/:id - Buscar marca por ID
router.get(
    '/:id',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    brandController.getById
);

// ======================================================
// ROTAS ADMINISTRATIVAS
// ======================================================

// POST /api/brands - Criar nova marca
router.post('/', authenticate, requireAdmin, brandController.create);

// PUT /api/brands/:id - Atualizar marca
router.put(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    brandController.update
);

// DELETE /api/brands/:id - Remover marca
router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    brandController.delete
);

module.exports = router;