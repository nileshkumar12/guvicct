const Brand = require('../models/brandModel');
const { isBase64Image } = require('../utils/imageHelper');
const { uploadBuffer, uploadBase64 } = require('../utils/cloudinary');

exports.createBrand = async (req, res) => {
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
      return res.status(400).json({ success: false, message: 'Brand name is required' });
    }

    const existing = await Brand.findOne({ name });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Brand already exists' });
    }

    const brand = await Brand.create({ name, description, image });
    return res.status(201).json({ success: true, data: brand });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find();
    return res.status(200).json({ success: true, count: brands.length, data: brands });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBrand = async (req, res) => {
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

    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    return res.status(200).json({ success: true, data: brand });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    return res.status(200).json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
