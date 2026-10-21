// ======================================================
// src/routes/wishlist.js
// Favoritos (requer autenticação)
// ======================================================
const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { wishlistController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

// Todas as rotas exigem login
router.use(authenticate);

// GET /api/wishlist/ids — lista só os IDs (para marcar corações)
router.get('/ids', wishlistController.listIds);

// GET /api/wishlist/count — contador
router.get('/count', wishlistController.count);

// GET /api/wishlist/check/:productId — está na wishlist?
router.get(
    '/check/:productId',
    param('productId').isInt({ min: 1 }).withMessage('ID inválido'),
    wishlistController.check
);

// POST /api/wishlist — adicionar
router.post('/', wishlistController.add);

// DELETE /api/wishlist/:productId — remover
router.delete(
    '/:productId',
    param('productId').isInt({ min: 1 }).withMessage('ID inválido'),
    wishlistController.remove
);

// GET /api/wishlist — listar (mais genérico, por último)
router.get('/', wishlistController.list);

module.exports = router;