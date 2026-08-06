const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { adminOrders, adminOrderDetails } = require('../controllers/orderController');

router.get('/orders', auth, adminOrders);
router.get('/orders/:id', auth, adminOrderDetails);

module.exports = router;