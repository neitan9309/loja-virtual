// ======================================================
// src/models/index.js
// Agregador de models
// ======================================================
const Brand = require('./Brand');
const Cart = require('./Cart');
const Category = require('./Category');
const Inventory = require('./Inventory');
const Product = require('./Product');
const Promotion = require('./Promotion');
const User = require('./User');

module.exports = {
    Brand,
    Cart,
    Category,
    Inventory,
    Product,
    Promotion,
    User,
};