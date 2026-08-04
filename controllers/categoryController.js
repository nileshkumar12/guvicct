const Category = require('../models/categoryModel');
const { isBase64Image } = require('../utils/imageHelper');
const { uploadBuffer, uploadBase64 } = require('../utils/cloudinary');

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body || {};
    let image = '';

    if (req.file && req.file.buffer) {
      const uploadResult = await uploadBuffer(req.file.buffer, req.file.mimetype);
      image = uploadResult.secure_url;
    } else if (req.body?.image && isBase64Image(req.body.image)) {
      const uploadResult = await uploadBase64(req.body.image);
      image = uploadResult.secure_url;
    } else {
      image = req.body?.image || '';
    }

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({ name, description, image });
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    return res.status(200).json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body || {};
    let image;

    if (req.file && req.file.buffer) {
      const uploadResult = await uploadBuffer(req.file.buffer, req.file.mimetype);
      image = uploadResult.secure_url;
    } else if (req.body?.image && isBase64Image(req.body.image)) {
      const uploadResult = await uploadBase64(req.body.image);
      image = uploadResult.secure_url;
    } else if (req.body?.image !== undefined) {
      image = req.body.image;
    }

    const updateData = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
    };

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    return res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
