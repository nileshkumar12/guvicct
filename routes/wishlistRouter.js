const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getWishlist, addProduct, removeProduct } = require('../controllers/wishlistController');

router.get('/', auth, getWishlist);
router.post('/', auth, addProduct);
router.delete('/:productId', auth, removeProduct);

module.exports = router;
