const express = require('express');
const router = express.Router();
const cepController = require('../controllers/cepController');

router.get('/:cep', cepController.lookup);

module.exports = router;