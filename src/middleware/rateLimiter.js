// ======================================================
// src/middleware/rateLimiter.js
// Rate limiting para endpoints sensíveis
// ======================================================
const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

// ======================================================
// LOGIN / REGISTRO — 10 tentativas / 15 min
// ======================================================
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 1000 : 10,      // relaxado em dev
    message: {
        error: 'Muitas tentativas. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Não conta requisições bem-sucedidas
    skipSuccessfulRequests: true,
});

// ======================================================
// CONSULTA DE CEP — 30 / min
// ======================================================
const cepLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isDev ? 1000 : 30,
    message: {
        error: 'Muitas consultas de CEP. Aguarde um momento.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ======================================================
// UPLOAD — 20 / hora
// ======================================================
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: isDev ? 1000 : 20,
    message: {
        error: 'Limite de uploads atingido. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ======================================================
// API GERAL — 300 / 15 min
// ======================================================
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 10000 : 300,
    message: {
        error: 'Muitas requisições. Aguarde um momento.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authLimiter,
    cepLimiter,
    uploadLimiter,
    apiLimiter,
};