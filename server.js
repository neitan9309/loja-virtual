// ======================================================
// server.js
// ======================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { pool } = require('./src/config/database');
const apiRoutes = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ======================================================
// MIDDLEWARES GLOBAIS
// ======================================================
app.use(helmet({ contentSecurityPolicy: false }));

// ======================================================
// CORS
// ======================================================
const allowedOrigins = NODE_ENV === 'production'
    ? CORS_ORIGIN.split(',').map((o) => o.trim())
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Permite requests sem origin (curl, Postman, mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Em dev, loga pra facilitar debug
        if (NODE_ENV === 'development') {
            console.warn(`🚫 CORS bloqueou origem: ${origin}`);
        }

        callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ======================================================
// NO-CACHE PARA PÁGINAS HTML
// ======================================================
app.use((req, res, next) => {
    const noCachePaths = [
        '/',
        '/produtos',
        '/categoria',
        '/login',
        '/minha-conta',
        '/checkout',
        '/admin',
    ];

    const isNoCache =
        noCachePaths.includes(req.path) ||
        req.path.startsWith('/produto/') ||
        req.path.startsWith('/admin');

    if (isNoCache) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// ======================================================
// ARQUIVOS ESTÁTICOS
// ======================================================
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Uploads (servido como estático)
const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Pasta de uploads criada: ${uploadsDir}`);
}
app.use('/uploads', express.static(uploadsDir));

console.log(`📁 Servindo arquivos estáticos de: ${publicDir}`);

// ======================================================
// API
// ======================================================
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
        app: process.env.APP_NAME || 'Luxury Store',
    });
});

// ======================================================
// PÁGINAS HTML
// ======================================================
app.get('/produtos', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'produtos.html'));
});

app.get('/categoria', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'categoria.html'));
});

app.get('/produto/:slug', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'produto.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'login.html'));
});

app.get('/minha-conta', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'minha-conta.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'checkout.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'index.html'));
});

// ======================================================
// 404 + FALLBACK SPA
// ======================================================
app.use(notFoundHandler);

// ======================================================
// TRATAMENTO DE ERROS (último)
// ======================================================
app.use(errorHandler);

// ======================================================
// INICIAR SERVIDOR
// ======================================================
app.listen(PORT, () => {
    console.log('════════════════════════════════════════');
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📦 Ambiente: ${NODE_ENV}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`🛠️  Admin: http://localhost:${PORT}/admin`);
    console.log(`📱 App: ${process.env.APP_NAME || 'Luxury Store'}`);
    console.log(`🌐 CORS (${NODE_ENV}):`, allowedOrigins.join(', '));
    console.log('════════════════════════════════════════');
});

// ======================================================
// ENCERRAMENTO GRACIOSO
// ======================================================
async function shutdown(signal) {
    console.log(`\n👋 Recebido ${signal}. Encerrando servidor...`);
    try {
        await pool.end();
        console.log('✅ Conexões com banco encerradas');
    } catch (err) {
        console.error('❌ Erro ao fechar pool:', err.message);
    }
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Captura erros não tratados (última linha de defesa)
process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    // Em produção, é boa prática reiniciar o processo
    if (NODE_ENV === 'production') {
        process.exit(1);
    }
});