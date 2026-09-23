const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

// Todas as rotas exigem login
router.use(authenticate);

router.get('/', cartController.getCart);
router.get('/count', cartController.getCount);
router.post('/', cartController.addItem);
router.put('/:id', cartController.updateItem);
router.delete('/:id', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;