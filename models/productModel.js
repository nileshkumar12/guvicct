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

const specificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    value: {
      type: String,
      required: true,
      trim: true,
    },

    unit: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const addonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    image: {
      type: String,
      default: "",
    },

    isRequired: {
      type: Boolean,
      default: false,
    },

    maxQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { _id: true }
);


const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  brand: { type: String },
  price: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  hsnCode: { type: String, default: "", trim: true },
  gstRate: { type: Number, default: 0, min: 0, max: 100 },
  priceIncludesGST: { type: Boolean, default: false },
  image: { type: String },
  images: { type: [String], default: [] },
  variants: { type: [variantSchema], default: [] },
  specifications: { type: [specificationSchema], default: [], },
  addons: { type: [addonSchema],default: [],},
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
