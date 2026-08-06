const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  placeOrder,
  buyerOrders,
  orderDetails,
  cancelOrder,
} = require('../controllers/orderController');

router.post('/', auth, placeOrder);
router.get('/buyer-orders', auth, buyerOrders);
router.get('/', auth, buyerOrders);
router.get('/:id', auth, orderDetails);
router.put('/:id/cancel', auth, cancelOrder);

module.exports = router;
