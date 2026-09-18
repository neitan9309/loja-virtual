const express = require('express');
const router = express.Router();

const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const brandRoutes = require('./brands');
const promotionRoutes = require('./promotions');
const inventoryRoutes = require('./inventory');

// Registra todas as rotas da API
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/promotions', promotionRoutes);
router.use('/inventory', inventoryRoutes);

module.exports = router;