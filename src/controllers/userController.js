const { validationResult } = require('express-validator');
const User = require('../models/User');

const userController = {
    // ==================================================
    // ATUALIZAR PRÓPRIO PERFIL
    // ==================================================
    async updateMe(req, res) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Dados inválidos',
                fields: errors.array().map(e => ({ field: e.path, message: e.msg }))
            });
        }

        try {
            const user = await User.update(req.userId, req.body);
            if (!user) {
                return res.status(404).json({ error: 'Nenhum campo para atualizar' });
            }
            res.json({
                message: 'Perfil atualizado com sucesso!',
                user
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            if (error.code === '23505') {
                return res.status(400).json({ error: 'CPF já cadastrado' });
            }
            res.status(500).json({ error: 'Erro ao atualizar perfil' });
        }
    },

    // ==================================================
    // ALTERAR SENHA
    // ==================================================
    async changePassword(req, res) {
        try {
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                return res.status(400).json({ error: 'Senha atual e nova são obrigatórias' });
            }

            if (new_password.length < 6) {
                return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
            }

            const user = await User.findById(req.userId);
            const fullUser = await User.findByEmail(user.email);

            const validPassword = await User.verifyPassword(current_password, fullUser.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Senha atual incorreta' });
            }

            await User.updatePassword(req.userId, new_password);
            res.json({ message: 'Senha alterada com sucesso!' });
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            res.status(500).json({ error: 'Erro ao alterar senha' });
        }
    }
};

module.exports = userController;