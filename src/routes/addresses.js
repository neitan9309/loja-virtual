const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { addressController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', addressController.list);
router.post('/', addressController.create);
router.put('/:id', param('id').isInt({ min: 1 }), addressController.update);
router.delete('/:id', param('id').isInt({ min: 1 }), addressController.delete);
router.patch('/:id/default', param('id').isInt({ min: 1 }), addressController.setDefault);

module.exports = router;