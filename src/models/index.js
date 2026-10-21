// ======================================================
// src/models/index.js
// ======================================================
const Product = require('./Product');
const Category = require('./Category');
const Brand = require('./Brand');
const Promotion = require('./Promotion');
const Inventory = require('./Inventory');
const User = require('./User');
const Cart = require('./Cart');
const Review = require('./Review');
const Order = require('./Order');
const Payment = require('./Payment');
const Metrics = require('./Metrics');
const Wishlist = require('./Wishlist');   // ← ADICIONADO

module.exports = {
    Product,
    Category,
    Brand,
    Promotion,
    Inventory,
    User,
    Cart,
    Review,
    Order,
    Payment,
    Metrics,
    Wishlist,   // ← ADICIONADO
};