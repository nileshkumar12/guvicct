const mongoose = require('mongoose');

const productStatuses = [
  'active',
  'inactive',
  'outofstock',
  'draft',
];

const variantSchema = new mongoose.Schema({
  attributes: { 
    type: Map,
    of: String,
    required: true,
  },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  sku: { type: String, required: true, trim: true },
  image: { type: String, default: "" },
  images: { type: [String], default: [] },
  status: {
    type: String,
    enum: productStatuses,
    default: 'draft',
  },
}, {
  _id: false,
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  brand: { type: String },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  image: { type: String },
  images: { type: [String], default: [] },
  variants: { type: [variantSchema], default: [] },
  status: {
    type: String,
    enum: productStatuses,
    default: 'draft',
  },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Product', productSchema);
