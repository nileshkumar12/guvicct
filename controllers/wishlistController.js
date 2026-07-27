const Wishlist = require('../models/wishlistModel');
const Product = require('../models/productModel');

exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    let wishlist = await Wishlist.findOne({ user: userId }).populate('products');
    if (!wishlist) wishlist = { user: userId, products: [] };
    return res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, products: [] });
    }

    if (wishlist.products.find(p => p.toString() === productId)) {
      return res.status(200).json({ success: true, data: wishlist });
    }

    wishlist.products.push(productId);
    await wishlist.save();
    await wishlist.populate('products');

    return res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

    wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
    await wishlist.save();
    await wishlist.populate('products');

    return res.status(200).json({ success: true, data: wishlist });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
