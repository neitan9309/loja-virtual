// ======================================================
// src/middleware/auth.js
// Autenticação JWT + autorização por role
// ======================================================
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// ======================================================
// CONFIGURAÇÃO
// ======================================================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('❌ JWT_SECRET é obrigatório em produção. Configure o .env');
    }
    console.warn('⚠️  JWT_SECRET não definido. Usando fallback INSEGURO de desenvolvimento.');
}

const SECRET = JWT_SECRET || 'dev-only-do-not-use-in-prod';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ======================================================
// CACHE DE USUÁRIOS (evita hit no banco a cada request)
// ======================================================
const userCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30s

async function getUserFromDb(userId) {
    const cached = userCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.user;
    }

    const result = await pool.query(
        'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
        [userId]
    );

    if (result.rows.length === 0) {
        userCache.delete(userId);
        return null;
    }

    const user = result.rows[0];
    userCache.set(userId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
    return user;
}

function invalidateUserCache(userId) {
    userCache.delete(userId);
}

// ======================================================
// MIDDLEWARE: exige token válido E usuário existente
// ======================================================
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
        decoded = jwt.verify(token, SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
        }
        return res.status(401).json({ error: 'Token inválido' });
    }

    try {
        const user = await getUserFromDb(decoded.id);

        if (!user) {
            return res.status(401).json({
                error: 'Sessão inválida. Faça login novamente.',
                code: 'USER_NOT_FOUND'
            });
        }

        req.userId = user.id;
        req.userEmail = user.email;
        req.userRole = user.role || 'customer';
        req.token = token;
        next();
    } catch (error) {
        console.error('Erro ao verificar usuário:', error);
        return res.status(500).json({ error: 'Erro ao validar sessão' });
    }
}

// ======================================================
// MIDDLEWARE: token opcional
// ======================================================
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, SECRET);
            const user = await getUserFromDb(decoded.id);

            if (user) {
                req.userId = user.id;
                req.userEmail = user.email;
                req.userRole = user.role || 'customer';
                req.token = token;
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('optionalAuth ignorou token inválido:', error.message);
            }
        }
    }
    next();
}

// ======================================================
// MIDDLEWARE: exige role específico
// ======================================================
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.userId) {
            return res.status(401).json({ error: 'Não autenticado' });
        }
        if (!roles.includes(req.userRole)) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        next();
    };
}

// ======================================================
// MIDDLEWARE: exige admin
// ======================================================
const requireAdmin = requireRole('admin');

// ======================================================
// GERAÇÃO DE TOKEN
// ======================================================
function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role || 'customer' },
        SECRET,
        { expiresIn: EXPIRES_IN }
    );
}

module.exports = {
    authenticate,
    optionalAuth,
    requireRole,
    requireAdmin,
    generateToken,
    invalidateUserCache,
};