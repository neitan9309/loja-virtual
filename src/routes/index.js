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
const cartRoutes = require('./cart');   // ✅ NOVO

router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/promotions', promotionRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/cep', cepRoutes);
router.use('/cart', cartRoutes);        // ✅ NOVO

module.exports = router;