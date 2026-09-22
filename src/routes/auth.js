const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Validações de registro
const registerValidation = [
    body('full_name').trim().notEmpty().withMessage('Nome completo é obrigatório')
        .isLength({ min: 3, max: 150 }).withMessage('Nome deve ter entre 3 e 150 caracteres'),
    body('email').trim().isEmail().withMessage('Email inválido')
        .normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
    body('cpf').optional({ checkFalsy: true }).matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
        .withMessage('CPF deve estar no formato 000.000.000-00'),
    body('phone').optional({ checkFalsy: true }).isLength({ min: 10, max: 20 })
        .withMessage('Telefone inválido')
];

// Validações de login
const loginValidation = [
    body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password').notEmpty().withMessage('Senha é obrigatória')
];

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

module.exports = router;