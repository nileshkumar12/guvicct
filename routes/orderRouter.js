const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  placeOrder,
  buyerOrders,
  orderDetails,
  cancelOrder,
  deleteBuyerOrderHistory,
} = require('../controllers/orderController');

router.post('/', auth, placeOrder);
router.get('/buyer-orders', auth, buyerOrders);
router.get('/', auth, buyerOrders);
router.get('/:id', auth, orderDetails);
router.put('/:id/cancel', auth, cancelOrder);
router.delete('/:id', auth, deleteBuyerOrderHistory);

module.exports = router;
