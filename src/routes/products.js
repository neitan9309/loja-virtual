// ======================================================
// src/routes/products.js
// ======================================================
const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { productController, reviewController } = require('../controllers');
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');

// ======================================================
// ROTAS ADMIN DE AVALIAÇÕES (DEVEM VIR ANTES DE /admin/:id)
// ======================================================
router.get('/admin/reviews', authenticate, requireAdmin, productController.adminListReviews);
router.delete('/admin/reviews/:id', authenticate, requireAdmin, productController.adminDeleteReview);

// ======================================================
// ROTAS ADMIN (DEVEM VIR ANTES DE /:id)
// ======================================================
router.get('/admin/stats', authenticate, requireAdmin, productController.adminStats);
router.get('/admin/top-sellers', authenticate, requireAdmin, productController.topSellers);
router.get('/admin/top-sellers/:id/stats', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), productController.salesStats);
router.get('/admin/list', authenticate, requireAdmin, productController.adminList);
router.get('/admin/:id', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), productController.getByIdAdmin);

// ======================================================
// ROTAS PÚBLICAS
// ======================================================
router.get('/search', productController.search);
router.get('/', productController.list);
router.get('/slug/:slug', optionalAuth, productController.getBySlug);
router.get('/:id', optionalAuth, param('id').isInt({ min: 1 }).withMessage('ID inválido'), productController.getById);

// ======================================================
// AVALIAÇÕES (reviews)
// ======================================================
router.get('/:productId/reviews', param('productId').isInt({ min: 1 }).withMessage('ID inválido'), reviewController.list);
router.get('/:productId/reviews/mine', authenticate, param('productId').isInt({ min: 1 }).withMessage('ID inválido'), reviewController.getMine);
router.post('/:productId/reviews', authenticate, param('productId').isInt({ min: 1 }).withMessage('ID inválido'), reviewController.create);
router.put('/:productId/reviews/:reviewId', authenticate, param('productId').isInt({ min: 1 }).withMessage('ID inválido'), param('reviewId').isInt({ min: 1 }).withMessage('ID inválido'), reviewController.update);
router.delete('/:productId/reviews/:reviewId', authenticate, param('productId').isInt({ min: 1 }).withMessage('ID inválido'), param('reviewId').isInt({ min: 1 }).withMessage('ID inválido'), reviewController.delete);

// ======================================================
// ROTAS ADMINISTRATIVAS
// ======================================================
router.post('/', authenticate, requireAdmin, productController.create);
router.put('/:id', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), productController.update);
router.patch('/:id', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), productController.patchField);
router.delete('/:id', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), productController.delete);

// ======================================================
// IMAGENS (ADMIN)
// ======================================================
router.post('/:id/images', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), productController.addImage);
router.delete('/:id/images/:imageId', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), param('imageId').isInt({ min: 1 }).withMessage('ID da imagem inválido'), productController.removeImage);
router.put('/:id/images/:imageId/primary', authenticate, requireAdmin, param('id').isInt({ min: 1 }).withMessage('ID inválido'), param('imageId').isInt({ min: 1 }).withMessage('ID da imagem inválido'), productController.setPrimaryImage);

module.exports = router;