// ======================================================
// src/controllers/index.js
// Agregador de controllers
// ======================================================
const authController = require('./authController');
const brandController = require('./brandController');
const cartController = require('./cartController');
const categoryController = require('./categoryController');
const cepController = require('./cepController');
const inventoryController = require('./inventoryController');
const productController = require('./productController');
const promotionController = require('./promotionController');
const uploadController = require('./uploadController');
const userController = require('./userController');

module.exports = {
    authController,
    brandController,
    cartController,
    categoryController,
    cepController,
    inventoryController,
    productController,
    promotionController,
    uploadController,
    userController,
};