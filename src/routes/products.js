const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');

// ========================
// ROTAS PÚBLICAS
// ========================

// GET /api/products - Listar produtos com filtros
// Query params: category, brand, min_price, max_price, search, 
//               featured, new, best_seller, sort, order, limit, offset
router.get('/', productController.list);

// GET /api/products/slug/:slug - Buscar produto por slug (URL amigável)
router.get('/slug/:slug', productController.getBySlug);

// GET /api/products/:id - Buscar produto por ID
router.get('/:id', productController.getById);

// ========================
// ROTAS ADMINISTRATIVAS
// (Futuramente proteger com autenticação)
// ========================

// POST /api/products - Criar novo produto
router.post('/', productController.create);

// PUT /api/products/:id - Atualizar produto
router.put('/:id', productController.update);

// DELETE /api/products/:id - Remover produto (soft delete)
router.delete('/:id', productController.delete);

module.exports = router;