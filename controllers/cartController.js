const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) cart = { user: userId, items: [] };
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, items } = req.body;

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Support bulk cart sync payload: { items: [{ product|productId, quantity }] }
    if (Array.isArray(items)) {
      const normalizedItems = [];

      for (const item of items) {
        const incomingProductId = item?.productId || item?.product;
        if (!incomingProductId) {
          return res.status(400).json({ success: false, message: 'Each item must include productId or product' });
        }

        const product = await Product.findById(incomingProductId);
        if (!product) {
          return res.status(404).json({ success: false, message: `Product not found: ${incomingProductId}` });
        }

        const qty = Number(item?.quantity ?? 1);
        if (!Number.isFinite(qty) || qty <= 0) {
          return res.status(400).json({ success: false, message: `Invalid quantity for product: ${incomingProductId}` });
        }

        normalizedItems.push({
          product: incomingProductId,
          quantity: qty,
          price: product.price,
        });
      }

      cart.items = normalizedItems;
      await cart.save();
      await cart.populate('items.product');
      return res.status(200).json({ success: true, data: cart });
    }

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required when items is not provided' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const existingIndex = cart.items.findIndex(i => i.product.toString() === productId);
    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += Number(quantity);
      cart.items[existingIndex].price = product.price;
    } else {
      cart.items.push({ product: productId, quantity: Number(quantity), price: product.price });
    }

    await cart.save();
    await cart.populate('items.product');
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ success: false, message: 'quantity is required' });

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });

    item.quantity = Number(quantity);
    await cart.save();
    await cart.populate('items.product');
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });

    item.remove();
    await cart.save();
    await cart.populate('items.product');
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = [];
    await cart.save();
    return res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.cartSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) return res.status(200).json({ success: true, data: { itemCount: 0, total: 0 } });

    let itemCount = 0;
    let total = 0;
    for (const it of cart.items) {
      itemCount += it.quantity;
      total += (it.price || (it.product && it.product.price) || 0) * it.quantity;
    }

    return res.status(200).json({ success: true, data: { itemCount, total } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
