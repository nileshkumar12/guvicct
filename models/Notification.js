const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  type: {
    type: String,
    enum: ['new_order', 'order_cancelled', 'order_returned', 'payment_received', 'low_stock'],
    default: 'new_order',
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  isRead:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);