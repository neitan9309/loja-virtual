// ======================================================
// src/routes/categories.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { categoryController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ======================================================
// ROTAS PÚBLICAS
// ======================================================

// Árvore completa (3 níveis) — deve vir antes de /:id
router.get('/tree-full', categoryController.treeFull);

// Árvore com subcategories (legado)
router.get('/tree', categoryController.tree);

// Listagem e busca
router.get('/', categoryController.list);
router.get('/slug/:slug', categoryController.getBySlug);

router.get(
    '/:id',
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    categoryController.getById
);

// ======================================================
// ROTAS ADMINISTRATIVAS
// ======================================================

router.post('/', authenticate, requireAdmin, categoryController.create);

router.put(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    categoryController.update
);

router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    categoryController.delete
);

module.exports = router;