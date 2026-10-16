// ======================================================
// src/routes/index.js
// ======================================================
const express = require('express');
const router = express.Router();

const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const brandRoutes = require('./brands');
const promotionRoutes = require('./promotions');
const inventoryRoutes = require('./inventory');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const cepRoutes = require('./cep');
const cartRoutes = require('./cart');
const uploadRoutes = require('./upload');
const orderRoutes = require('./orders');
const metricsRoutes = require('./metrics');

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/promotions', promotionRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cep', cepRoutes);
router.use('/cart', cartRoutes);
router.use('/upload', uploadRoutes);
router.use('/orders', orderRoutes);
router.use('/metrics', metricsRoutes);

module.exports = router;