// ======================================================
// src/controllers/authController.js
// ======================================================
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// ======================================================
// HELPER: validação de erros do express-validator
// ======================================================
function checkValidation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            fields: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    return null;
}

// ======================================================
// HELPER: monta resposta de sucesso (user + token)
// ======================================================
function buildAuthResponse(user, token, message) {
    // Nunca retornar password_hash
    if (user.password_hash) delete user.password_hash;
    return { message, user, token };
}

// ======================================================
// HELPER: trata erro 23505 (unique violation)
// ======================================================
function handleUniqueViolation(error, res) {
    if (error.code !== '23505') return false;

    if (error.detail?.includes('cpf')) {
        res.status(400).json({ error: 'CPF já cadastrado' });
    } else {
        res.status(400).json({ error: 'Email já cadastrado' });
    }
    return true;
}

const authController = {
    // ==================================================
    // REGISTRO (cliente)
    // ==================================================
    async register(req, res) {
        if (checkValidation(req, res)) return;

        try {
            const { email } = req.body;

            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            const user = await User.create(req.body);
            const token = generateToken(user);

            // Registra sessão
            await User.saveSession({
                user_id: user.id,
                token,
                user_agent: req.headers['user-agent'] || null,
                ip_address: req.ip,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            await User.registerLogin(user.id);

            res.status(201).json(
                buildAuthResponse(user, token, 'Cadastro realizado com sucesso!')
            );
        } catch (error) {
            console.error('Erro no registro:', error);
            if (handleUniqueViolation(error, res)) return;
            res.status(500).json({ error: 'Erro ao criar usuário' });
        }
    },

    // ==================================================
    // LOGIN (cliente)
    // ==================================================
    async login(req, res) {
        if (checkValidation(req, res)) return;

        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: 'Email ou senha incorretos' });
            }

            const validPassword = await User.verifyPassword(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Email ou senha incorretos' });
            }

            const token = generateToken(user);

            await User.saveSession({
                user_id: user.id,
                token,
                user_agent: req.headers['user-agent'] || null,
                ip_address: req.ip,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            await User.registerLogin(user.id);

            res.json(buildAuthResponse(user, token, 'Login realizado com sucesso!'));
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({ error: 'Erro ao fazer login' });
        }
    },

    // ==================================================
    // LOGIN ADMIN (endpoint dedicado)
    // Só aceita usuários com role = 'admin'
    // ==================================================
    async adminLogin(req, res) {
        if (checkValidation(req, res)) return;

        try {
            const { email, password } = req.body;

            const user = await User.findByEmail(email);

            // ⚠️ Mensagem genérica pra não vazar se o email existe
            if (!user) {
                return res.status(401).json({ error: 'Email ou senha incorretos' });
            }

            const validPassword = await User.verifyPassword(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Email ou senha incorretos' });
            }

            // ✅ Só admins passam
            if (user.role !== 'admin') {
                return res.status(403).json({
                    error: 'Acesso restrito a administradores',
                    code: 'NOT_ADMIN',
                });
            }

            const token = generateToken(user);

            await User.saveSession({
                user_id: user.id,
                token,
                user_agent: req.headers['user-agent'] || null,
                ip_address: req.ip,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            await User.registerLogin(user.id);

            res.json(
                buildAuthResponse(user, token, 'Login de administrador realizado com sucesso!')
            );
        } catch (error) {
            console.error('Erro no login admin:', error);
            res.status(500).json({ error: 'Erro ao fazer login' });
        }
    },

    // ==================================================
    // DADOS DO USUÁRIO LOGADO
    // ==================================================
    async me(req, res) {
        try {
            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            res.json(user);
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({ error: 'Erro ao buscar dados' });
        }
    },

    // ==================================================
    // LOGOUT
    // ==================================================
    async logout(req, res) {
        try {
            if (req.token) {
                await User.deleteSession(req.token);
            }
            res.json({ message: 'Logout realizado com sucesso' });
        } catch (error) {
            console.error('Erro no logout:', error);
            res.status(500).json({ error: 'Erro ao fazer logout' });
        }
    },
};

module.exports = authController;