// ======================================================
// src/routes/upload.js
// ======================================================
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

// ======================================================
// TODAS as rotas de upload exigem admin
// ======================================================
router.use(authenticate, requireAdmin);

// POST /api/upload  (form-data, campo "image")
router.post('/', uploadLimiter, uploadController.uploadImage);

// DELETE /api/upload/:filename
router.delete('/:filename', uploadController.deleteFile);

module.exports = router;