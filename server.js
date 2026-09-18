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

// ======================================================
// MIDDLEWARES
// ======================================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ======================================================
// NO-CACHE PARA PÁGINAS HTML (evita servir versão antiga)
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
// ======================================================
app.use(express.static(path.join(__dirname, 'public')));
console.log('📁 Servindo arquivos estáticos de:', path.join(__dirname, 'public'));

// ======================================================
// ROTAS DA API
// ======================================================
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ======================================================
// ROTAS DE PÁGINAS ESPECÍFICAS
// ======================================================
app.get('/produtos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'produtos.html'));
});

app.get('/categoria', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'categoria.html'));
});

app.get('/produto/:slug', (req, res) => {
    res.redirect('/produtos');
});

// ======================================================
// FALLBACK SPA
// ======================================================
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'Rota não encontrada' });
    }
});

// ======================================================
// TRATAMENTO DE ERROS
// ======================================================
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.message);
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================
app.listen(PORT, () => {
    console.log('════════════════════════════════════════');
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`🛠️  Admin: http://localhost:${PORT}/admin`);
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