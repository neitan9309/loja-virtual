const express = require('express');
const router = express.Router();

// Rotas existentes
const productRoutes = require('./products');
const categoryRoutes = require('./categories');
const brandRoutes = require('./brands');
const promotionRoutes = require('./promotions');
const inventoryRoutes = require('./inventory');

// Rotas novas
const authRoutes = require('./auth');
const userRoutes = require('./users');
const cepRoutes = require('./cep');

// ==================================================
// REGISTRAR TODAS AS ROTAS
// ==================================================
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/promotions', promotionRoutes);
router.use('/inventory', inventoryRoutes);

// Novas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cep', cepRoutes);

module.exports = router;