const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  brand: { type: String },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  image: { type: String },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Product', productSchema);
