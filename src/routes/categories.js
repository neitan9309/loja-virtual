const express = require('express');
const router = express.Router();
const { categoryController } = require('../controllers');

// Árvore completa (3 níveis) — deve vir antes de /:id
router.get('/tree-full', categoryController.treeFull);

// Árvore com subcategories (legado)
router.get('/tree', categoryController.tree);

// Listagem e busca
router.get('/', categoryController.list);
router.get('/slug/:slug', categoryController.getBySlug);
router.get('/:id', categoryController.getById);

// Escrita
router.post('/', categoryController.create);
router.put('/:id', categoryController.update);
router.delete('/:id', categoryController.delete);

module.exports = router;