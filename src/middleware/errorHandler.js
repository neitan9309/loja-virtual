// ======================================================
// src/middleware/errorHandler.js
// Tratamento centralizado de erros
// ======================================================

/**
 * Cria um erro com status HTTP customizado
 * Uso: throw createError(400, 'Mensagem')
 */
function createError(status, message, details = null) {
    const error = new Error(message);
    error.status = status;
    if (details) error.details = details;
    return error;
}

/**
 * Middleware global de tratamento de erros
 * Deve ser registrado por ÚLTIMO no app.js/server.js
 */
function errorHandler(err, req, res, next) {
    // Se a resposta já foi enviada, delega pro Express
    if (res.headersSent) {
        return next(err);
    }

    // Log sempre (em dev, com stack)
    if (process.env.NODE_ENV !== 'test') {
        console.error(`❌ ${req.method} ${req.originalUrl}`);
        console.error(`   ${err.message}`);
        if (process.env.NODE_ENV === 'development') {
            console.error(err.stack);
        }
    }

    // ==================================================
    // ERROS DO POSTGRES
    // ==================================================
    if (err.code === '23505') {  // unique_violation
        const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'campo';
        return res.status(400).json({
            error: `O ${field} informado já está em uso`,
            field
        });
    }

    if (err.code === '23503') {  // foreign_key_violation
        return res.status(400).json({
            error: 'Referência inválida. Verifique os dados enviados.'
        });
    }

    if (err.code === '23502') {  // not_null_violation
        const field = err.column || 'campo';
        return res.status(400).json({
            error: `O campo "${field}" é obrigatório`
        });
    }

    if (err.code === '23514') {  // check_violation
        return res.status(400).json({
            error: 'Valor inválido para um dos campos'
        });
    }

    // ==================================================
    // ERROS DO MULTER
    // ==================================================
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande (máx: 5MB)' });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Campo de arquivo inesperado' });
    }

    // ==================================================
    // ERROS DE JWT
    // ==================================================
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
    }

    // ==================================================
    // ERRO CUSTOMIZADO (com status)
    // ==================================================
    if (err.status) {
        return res.status(err.status).json({
            error: err.message,
            ...(err.details && { details: err.details })
        });
    }

    // ==================================================
    // FALLBACK
    // ==================================================
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor'
            : err.message
    });
}

/**
 * Middleware para rotas não encontradas (404)
 */
function notFoundHandler(req, res) {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Rota não encontrada' });
    }
    // Não-API deixa o Express servir o index (fallback SPA)
    res.status(404).sendFile(require('path').join(__dirname, '..', '..', 'public', 'index.html'));
}

module.exports = {
    createError,
    errorHandler,
    notFoundHandler,
};