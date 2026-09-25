// ======================================================
// src/routes/users.js
// ======================================================
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Todas as rotas exigem autenticação
router.use(authenticate);

// ======================================================
// VALIDAÇÕES
// ======================================================
const updateValidation = [
    body('full_name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 })
        .withMessage('Nome deve ter entre 3 e 150 caracteres'),
    body('gender')
        .optional()
        .isIn(['masculino', 'feminino', 'outro', 'prefiro_nao_dizer'])
        .withMessage('Gênero inválido'),
    body('cpf')
        .optional({ checkFalsy: true })
        .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
        .withMessage('CPF inválido'),
    body('cep')
        .optional({ checkFalsy: true })
        .matches(/^\d{5}-?\d{3}$/)
        .withMessage('CEP inválido'),
    body('state')
        .optional({ checkFalsy: true })
        .isLength({ min: 2, max: 2 })
        .withMessage('UF deve ter 2 caracteres'),
    body('phone')
        .optional({ checkFalsy: true })
        .isLength({ min: 10, max: 20 })
        .withMessage('Telefone inválido'),
];

// ======================================================
// ROTAS
// ======================================================
router.put('/me', updateValidation, userController.updateMe);
router.put('/me/password', userController.changePassword);
router.delete('/me', userController.deleteMe);

module.exports = router;