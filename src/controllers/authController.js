const { validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

const authController = {
    // ==================================================
    // REGISTRO
    // ==================================================
    async register(req, res) {
        // Validações
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                fields: errors.array().map(e => ({ field: e.path, message: e.msg }))
            });
        }

        try {
            const { email } = req.body;

            // Verifica se já existe
            const existing = await User.findByEmail(email);
            if (existing) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            // Cria usuário
            const user = await User.create(req.body);

            // Gera token
            const token = generateToken(user);

            // Registra sessão
            await User.saveSession({
                user_id: user.id,
                token,
                user_agent: req.headers['user-agent'] || null,
                ip_address: req.ip,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
            });

            // Registra último login
            await User.registerLogin(user.id);

            res.status(201).json({
                message: 'Cadastro realizado com sucesso!',
                user,
                token
            });
        } catch (error) {
            console.error('Erro no registro:', error);

            if (error.code === '23505') {
                if (error.detail?.includes('cpf')) {
                    return res.status(400).json({ error: 'CPF já cadastrado' });
                }
                return res.status(400).json({ error: 'Email já cadastrado' });
            }

            res.status(500).json({ error: 'Erro ao criar usuário' });
        }
    },

    // ==================================================
    // LOGIN
    // ==================================================
    async login(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                fields: errors.array().map(e => ({ field: e.path, message: e.msg }))
            });
        }

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

            // Gera token
            const token = generateToken(user);

            // Salva sessão
            await User.saveSession({
                user_id: user.id,
                token,
                user_agent: req.headers['user-agent'] || null,
                ip_address: req.ip,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });

            // Registra último login
            await User.registerLogin(user.id);

            // Remove senha antes de retornar
            delete user.password_hash;

            res.json({
                message: 'Login realizado com sucesso!',
                user,
                token
            });
        } catch (error) {
            console.error('Erro no login:', error);
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
    }
};

module.exports = authController;