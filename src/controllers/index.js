// ======================================================
// src/controllers/index.js
// ======================================================
const authController = require('./authController');
const brandController = require('./brandController');
const cartController = require('./cartController');
const categoryController = require('./categoryController');
const cepController = require('./cepController');
const inventoryController = require('./inventoryController');
const orderController = require('./orderController');
const productController = require('./productController');
const promotionController = require('./promotionController');
const reviewController = require('./reviewController');
const uploadController = require('./uploadController');
const userController = require('./userController');
const metricsController = require('./metricsController');
const wishlistController = require('./wishlistController');   // ← ADICIONADO

module.exports = {
    authController,
    brandController,
    cartController,
    categoryController,
    cepController,
    inventoryController,
    orderController,
    productController,
    promotionController,
    reviewController,
    uploadController,
    userController,
    metricsController,
    wishlistController,   // ← ADICIONADO
};