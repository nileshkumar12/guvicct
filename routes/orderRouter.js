const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  placeOrder,
  orderHistory,
  orderDetails,
  cancelOrder,
} = require('../controllers/orderController');

router.post('/', auth, placeOrder);
router.get('/', auth, orderHistory);
router.get('/:id', auth, orderDetails);
router.put('/:id/cancel', auth, cancelOrder);

module.exports = router;
