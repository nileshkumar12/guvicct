const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getSellerProducts } = require('../controllers/productController');

router.get('/products', auth, getSellerProducts);

module.exports = router;
