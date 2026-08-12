const Shipment = require('../models/Shipment');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const { sendShipmentUpdateEmail } = require('../utils/sendEmail');

// POST /api/seller/shipments
exports.createShipment = async (req, res) => {
  try {
    const { orderId, carrier, trackingNumber, estimatedDelivery, shippingAddress } = req.body;

    const existing = await Shipment.findOne({ orderId });
    if (existing) return res.status(400).json({ success: false, message: 'Shipment already exists for this order' });

    const shipment = await Shipment.create({
      orderId, sellerId: req.user._id,
      carrier, trackingNumber, estimatedDelivery, shippingAddress,
      statusHistory: [{ status: 'pending', note: 'Shipment created' }],
    });

    await Order.findByIdAndUpdate(orderId, { status: 'shipped' });

    res.status(201).json({ success: true, shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/seller/shipments
exports.getSellerShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({ sellerId: req.user._id })
      .populate('orderId', 'orderNumber totalAmount createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, shipments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/seller/shipments/:shipmentId
exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ _id: req.params.shipmentId, sellerId: req.user._id })
      .populate('orderId');
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/seller/shipments/:shipmentId/status
exports.updateShipmentStatus = async (req, res) => {
  try {
    const { status, trackingNumber, carrier, note } = req.body;
    const shipment = await Shipment.findOne({ _id: req.params.shipmentId, sellerId: req.user._id });
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    shipment.status = status;
    if (trackingNumber) shipment.trackingNumber = trackingNumber;
    if (carrier) shipment.carrier = carrier;
    shipment.statusHistory.push({ status, note, updatedAt: new Date() });
    await shipment.save();

    const updatedOrder = await Order.findByIdAndUpdate(shipment.orderId, { status }, { new: true })
      .populate('user', 'name email');

    if (updatedOrder?.user?.email) {
      try {
        await sendShipmentUpdateEmail({
          email: updatedOrder.user.email,
          name: updatedOrder.user.name,
          orderNumber: updatedOrder.orderNumber,
          status,
          trackingNumber: shipment.trackingNumber,
          carrier: shipment.carrier,
        });
      } catch (emailErr) {
        console.error('Shipment email failed:', emailErr.message);
      }
    }

    res.json({ success: true, shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shipments/:trackingNumber/track
exports.trackShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({ trackingNumber: req.params.trackingNumber })
      .populate('orderId', 'orderNumber totalAmount');
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/seller/shipments/:shipmentId/cancel
exports.cancelShipment = async (req, res) => {
  try {
    const { reason } = req.body;
    const shipment = await Shipment.findOne({ _id: req.params.shipmentId, sellerId: req.user._id });
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    if (shipment.status === 'delivered') return res.status(400).json({ success: false, message: 'Cannot cancel a delivered shipment' });

    shipment.status = 'cancelled';
    shipment.statusHistory.push({ status: 'cancelled', note: reason, updatedAt: new Date() });
    await shipment.save();

    await Order.findByIdAndUpdate(shipment.orderId, { status: 'cancelled' });

    res.json({ success: true, message: 'Shipment cancelled', shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};