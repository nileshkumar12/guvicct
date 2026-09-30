const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getSellerProducts } = require('../controllers/productController');
const {sellerOrders,sellerOrderById,updateSellerOrderStatus,} = require('../controllers/orderController');

router.get('/products', auth, getSellerProducts);
router.get('/orders', auth, sellerOrders);
router.get('/orders/:id', auth, sellerOrderById);
router.patch('/orders/:id', auth, updateSellerOrderStatus);

module.exports = router;
