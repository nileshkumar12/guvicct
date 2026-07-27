const Product = require('../models/productModel');
const User = require('../models/userModel');

const requireSeller = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw { status: 401, message: 'User not found' };
  if (user.role !== 'seller') throw { status: 403, message: 'Seller access required' };
  return user;
};

exports.getProducts = async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, rating, q } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (rating) filter.rating = { $gte: Number(rating) };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
      ];
    }

    const products = await Product.find(filter);
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const seller = await requireSeller(req.user.id);
    const { name, description, category, brand, price, rating, stock, image } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ success: false, message: 'Name, category, and price are required' });
    }

    const product = await Product.create({
      name,
      description,
      category,
      brand,
      price,
      rating,
      stock,
      image,
      seller: seller._id,
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const seller = await requireSeller(req.user.id);
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.seller.toString() !== seller._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }

    const updateData = { ...req.body };
    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const seller = await requireSeller(req.user.id);
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.seller.toString() !== seller._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.getSellerProducts = async (req, res) => {
  try {
    const seller = await requireSeller(req.user.id);
    const products = await Product.find({ seller: seller._id });
    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
