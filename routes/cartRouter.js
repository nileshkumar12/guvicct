const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCart,
  addProduct,
  updateQuantity,
  removeProduct,
  clearCart,
  cartSummary,
} = require('../controllers/cartController');

router.get('/', auth, getCart);
router.post('/', auth, addProduct);
router.put('/:itemId', auth, updateQuantity);
router.delete('/:itemId', auth, removeProduct);
router.delete('/', auth, clearCart);
router.get('/summary', auth, cartSummary);

module.exports = router;
