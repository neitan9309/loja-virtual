// ======================================================
// src/routes/products.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { productController } = require('../controllers');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

// ======================================================
// ROTAS ADMIN (DEVEM VIR ANTES DE /:id)
// ======================================================

// Listar produtos para o admin (com filtros + paginação)
router.get('/admin/list', authenticate, requireAdmin, productController.adminList);

// Buscar 1 produto para o admin (com sku, cost_price)
router.get(
    '/admin/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    productController.getByIdAdmin
);

// ======================================================
// ROTAS PÚBLICAS
// ======================================================

// Buscar produtos (nome/sku/id)
router.get('/search', productController.search);

// Listar produtos
router.get('/', productController.list);

// Buscar por slug (URL amigável)
// optionalAuth: se for admin, vê sku/cost_price; senão, esconde
router.get('/slug/:slug', optionalAuth, productController.getBySlug);

// Buscar por ID
// optionalAuth: se for admin, vê sku/cost_price; senão, esconde
router.get(
    '/:id',
    optionalAuth,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    productController.getById
);

// ======================================================
// ROTAS ADMINISTRATIVAS
// ======================================================

// Criar produto
router.post('/', authenticate, requireAdmin, productController.create);

// Atualizar produto completo
router.put(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    productController.update
);

// Atualizar apenas 1 campo (edição inline)
router.patch(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    productController.patchField
);

// Soft delete
router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    productController.delete
);

// ======================================================
// IMAGENS (ADMIN)
// ======================================================

router.post(
    '/:id/images',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    productController.addImage
);

router.delete(
    '/:id/images/:imageId',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    param('imageId').isInt({ min: 1 }).withMessage('ID da imagem inválido'),
    productController.removeImage
);

router.put(
    '/:id/images/:imageId/primary',
    authenticate,
    requireAdmin,
    param('id').isInt({ min: 1 }).withMessage('ID inválido'),
    param('imageId').isInt({ min: 1 }).withMessage('ID da imagem inválido'),
    productController.setPrimaryImage
);

module.exports = router;