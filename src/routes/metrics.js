// ======================================================
// src/routes/metrics.js
// Endpoints de métricas (dashboard)
// Todas as rotas exigem admin
// ======================================================
const express = require('express');
const router = express.Router();
const { metricsController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Todas as rotas de métricas exigem admin
router.use(authenticate, requireAdmin);

// GET /api/metrics?period=30d — tudo em uma chamada
router.get('/', metricsController.getAll);

// GET /api/metrics/overview?period=30d — apenas KPIs
router.get('/overview', metricsController.getOverview);

// GET /api/metrics/detail?type=revenue|customers&period=30d&page=1&limit=20
router.get('/detail', metricsController.getDetail);

module.exports = router;