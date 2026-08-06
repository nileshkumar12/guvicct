const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getSellerProducts } = require('../controllers/productController');
const { sellerOrders, updateSellerOrderStatus } = require('../controllers/orderController');

router.get('/products', auth, getSellerProducts);
router.get('/orders', auth, sellerOrders);
router.patch('/orders/:id', auth, updateSellerOrderStatus);

module.exports = router;
