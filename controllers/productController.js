const Product = require('../models/productModel');
const User = require('../models/userModel');
const { IMG_URLS } = require('../utils/config');

const requireSeller = async (userId) => {
  const seller = await User.findById(userId);

  if (!seller) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (seller.role !== 'seller') {
    const error = new Error('Only sellers can manage products');
    error.status = 403;
    throw error;
  }

  return seller;
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('seller', 'name email');

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'seller',
      'name email'
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getSellerProducts = async (req, res) => {
  try {
    const seller = await requireSeller(req.user?.id);
    const products = await Product.find({ seller: seller._id }).populate(
      'seller',
      'name email'
    );

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const seller = await requireSeller(req.user?.id);
    const {
      name,
      description,
      category,
      brand,
      price,
      rating,
      stock,
    } = req.body || {};

    if (!name || !category || price === undefined || price === null || price === '') {
      return res.status(400).json({
        success: false,
        message: 'Name, category and price are required.',
      });
    }

    const image = req.file ? `${IMG_URLS || ''}/uploads/${req.file.filename}` : '';

    const product = await Product.create({
      name,
      description,
      category,
      brand,
      price,
      rating: rating || 0,
      stock: stock || 0,
      image,
      seller: seller._id,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (product.seller.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product.',
      });
    }

    const {
      name,
      description,
      category,
      brand,
      price,
      rating,
      stock,
    } = req.body || {};

    const updateData = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(brand !== undefined && { brand }),
      ...(price !== undefined && { price }),
      ...(rating !== undefined && { rating }),
      ...(stock !== undefined && { stock }),
    };

    if (req.file) {
      updateData.image = `${IMG_URLS || ''}/uploads/${req.file.filename}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (product.seller.toString() !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product.',
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
