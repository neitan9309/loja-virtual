const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'troque_por_uma_string_segura';

// ==================================================
// MIDDLEWARE: exige token válido E usuário existente
// ==================================================
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }

    // ✅ NOVO: verifica se o usuário existe no banco
    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND is_active = true',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Sessão inválida. Faça login novamente.',
                code: 'USER_NOT_FOUND'
            });
        }

        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.token = token;
        next();
    } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        return res.status(500).json({ error: 'Erro ao validar sessão' });
    }
}

// ==================================================
// MIDDLEWARE: token opcional
// ==================================================
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            // ✅ Verifica se usuário existe
            const result = await pool.query(
                'SELECT id FROM users WHERE id = $1 AND is_active = true',
                [decoded.id]
            );

            if (result.rows.length > 0) {
                req.userId = decoded.id;
                req.userEmail = decoded.email;
                req.token = token;
            }
        } catch (error) {
            // Ignora silenciosamente
        }
    }
    next();
}

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

module.exports = { authenticate, optionalAuth, generateToken };