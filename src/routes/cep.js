// ======================================================
// src/routes/cep.js
// ======================================================
const express = require('express');
const router = express.Router();
const cepController = require('../controllers/cepController');
const { cepLimiter } = require('../middleware/rateLimiter');

// GET /api/cep/:cep
router.get('/:cep', cepLimiter, cepController.lookup);

module.exports = router;