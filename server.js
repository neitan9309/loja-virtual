require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { pool } = require('./src/config/database');
const apiRoutes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ======================================================
// MIDDLEWARES
// ======================================================
app.use(helmet({ contentSecurityPolicy: false }));

// CORS com origem configurável via .env
app.use(cors({
    origin: NODE_ENV === 'production'
        ? CORS_ORIGIN.split(',').map(o => o.trim())
        : true,  // em dev, aceita todas as origens
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ======================================================
// NO-CACHE PARA PÁGINAS HTML
// ======================================================
app.use((req, res, next) => {
    if (req.path === '/' ||
        req.path === '/produtos' ||
        req.path === '/categoria' ||
        req.path.startsWith('/produto/') ||
        req.path.startsWith('/admin')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});

// ======================================================
// ARQUIVOS ESTÁTICOS
// Estrutura:
//   public/
//   ├── index.html          ← home
//   ├── admin/              ← painel
//   ├── html/               ← produtos.html, categoria.html, produto.html
//   ├── css/                ← styles.css, produtos.css, categoria.css, produto.css
//   └── js/                 ← script.js, produtos.js, categoria.js, produto.js
// ======================================================
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
console.log(`📁 Servindo arquivos estáticos de: ${publicDir}`);

// ======================================================
// ROTAS DA API
// ======================================================
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV,
        app: process.env.APP_NAME || 'Luxury Store'
    });
});

// ======================================================
// ROTAS DE PÁGINAS ESPECÍFICAS
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

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'index.html'));
});

// ======================================================
// ROTAS DE PÁGINAS ESPECÍFICAS
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

// ✅ NOVAS ROTAS
app.get('/login', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'login.html'));
});

app.get('/minha-conta', (req, res) => {
    res.sendFile(path.join(publicDir, 'html', 'minha-conta.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'index.html'));
});

// ======================================================
// FALLBACK SPA
// ======================================================
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(publicDir, 'index.html'));
    } else {
        res.status(404).json({ error: 'Rota não encontrada' });
    }
});

// ======================================================
// TRATAMENTO DE ERROS GLOBAL
// ======================================================
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.message);
    console.error(err.stack);

    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

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
    console.log('════════════════════════════════════════');
});

// ======================================================
// ENCERRAMENTO GRACIOSO
// ======================================================
process.on('SIGINT', async () => {
    console.log('\n👋 Encerrando servidor...');
    await pool.end();
    console.log('✅ Conexões com banco encerradas');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n👋 Encerrando servidor...');
    await pool.end();
    console.log('✅ Conexões com banco encerradas');
    process.exit(0);
});