const mongoose = require('mongoose');
const { generateOrderNumber } = require('../utils/orderId');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: generateOrderNumber,
    match: /^ORD-\d{8}-[A-F0-9]{6}$/,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,   unique: true, },
  items: [orderItemSchema],
  shippingAddress: { type: addressSchema, required: true },
  paymentMethod: { type: String, required: true },
  subtotal: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
}, { timestamps: true });

orderSchema.pre('validate', function setOrderNumberIfMissing(next) {
  if (!this.orderNumber) {
    this.orderNumber = generateOrderNumber();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
