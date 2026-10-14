// ======================================================
// src/middleware/validators.js
// ======================================================
const { body } = require('express-validator');

const orderValidators = {
    create: [
        body('payment_method')
            .notEmpty()
            .withMessage('Método de pagamento é obrigatório')
            .isIn(['pix', 'credit_card', 'boleto'])
            .withMessage('Método inválido'),
        body('shipping_address')
            .notEmpty()
            .withMessage('Endereço é obrigatório'),
        body('shipping_address.cep')
            .notEmpty()
            .withMessage('CEP é obrigatório')
            .matches(/^\d{5}-?\d{3}$/)
            .withMessage('CEP inválido'),
        body('shipping_address.street')
            .trim()
            .notEmpty()
            .withMessage('Rua é obrigatória'),
        body('shipping_address.number')
            .trim()
            .notEmpty()
            .withMessage('Número é obrigatório'),
        body('shipping_address.neighborhood')
            .trim()
            .notEmpty()
            .withMessage('Bairro é obrigatório'),
        body('shipping_address.city')
            .trim()
            .notEmpty()
            .withMessage('Cidade é obrigatória'),
        body('shipping_address.state')
            .trim()
            .isLength({ min: 2, max: 2 })
            .withMessage('UF deve ter 2 caracteres'),
    ],
};

module.exports = { orderValidators };