const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  image: { type: String },
}, {
  timestamps: true,
  collection: 'brands',
});

module.exports = mongoose.model('Brand', brandSchema);
