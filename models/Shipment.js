const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status:    { type: String },
  note:      { type: String },
  updatedAt: { type: Date, default: Date.now },
});

const shipmentSchema = new mongoose.Schema({
  orderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trackingNumber: { type: String },
  carrier: {
    type: String,
    enum: ['delhivery', 'bluedart', 'dtdc', 'fedex', 'ekart', 'other'],
    default: 'other',
  },
  status: {
    type: String,
    enum: ['pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'returned', 'cancelled'],
    default: 'pending',
  },
  shippingAddress: {
    name:    String,
    address: String,
    city:    String,
    state:   String,
    pincode: String,
    phone:   String,
  },
  estimatedDelivery: { type: Date },
  statusHistory: [statusHistorySchema],
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);