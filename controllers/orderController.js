const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const SellerNotification = require("../models/sellerNotificationModel");
const { generateOrderNumber } = require('../utils/orderId');
const ORDER_STATUS = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const requireRole = async (userId, allowedRoles) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (!allowedRoles.includes(user.role)) {
    const error = new Error(`Only ${allowedRoles.join(' or ')} can access this resource`);
    error.status = 403;
    throw error;
  }

  return user;
};
/*
const normalizeOrderItems = async (items) => {
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const incomingProductId = item?.productId || item?.product || item?._id;
    const product = await Product.findById(incomingProductId);
    if (!product) {
      const error = new Error(`Product not found: ${incomingProductId}`);
      error.status = 404;
      throw error;
    }

    const quantity = Number(item.quantity) || 1;
    const price = Number.isFinite(Number(item.price)) ? Number(item.price) : product.price;
    subtotal += price * quantity;
    orderItems.push({ product: product._id, quantity, price });
  }

  return { orderItems, subtotal };
};*/

const normalizeOrderItems = async (items) => {
  const orderItems = [];
  let subtotal = 0;

  // Store unique seller IDs
  const sellerIds = new Set();

  for (const item of items) {
    const incomingProductId =
      item?.productId ||
      item?.product ||
      item?._id;

    const product = await Product.findById(
      incomingProductId
    ).select("_id name price seller");

    if (!product) {
      const error = new Error(
        `Product not found: ${incomingProductId}`
      );

      error.status = 404;
      throw error;
    }

    const quantity = Number(item.quantity) || 1;

    const price = Number.isFinite(Number(item.price))
      ? Number(item.price)
      : product.price;

    subtotal += price * quantity;

    orderItems.push({
      product: product._id,
      quantity,
      price,
    });

    // Collect seller
    if (product.seller) {
      sellerIds.add(String(product.seller));
    }
  }

  return {
    orderItems,
    subtotal,
    sellerIds: [...sellerIds],
  };
};

const getSellerProductIds = async (sellerId) => {
  const products = await Product.find({ seller: sellerId }).select('_id');
  return products.map((product) => product._id);
};

const normalizeShippingAddress = (shippingAddress = {}) => ({
  line1: shippingAddress.line1 || shippingAddress.addressLine1 || shippingAddress.address || shippingAddress.street || '',
  line2: shippingAddress.line2 || shippingAddress.addressLine2 || '',
  city: shippingAddress.city || '',
  state: shippingAddress.state || '',
  postalCode: shippingAddress.postalCode || shippingAddress.zipCode || shippingAddress.zip || shippingAddress.pincode || '',
  country: shippingAddress.country || 'India',
});

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      items,
      shippingAddress,
      paymentMethod,
      shippingCost = 0,
      tax = 0,
    } = req.body;

    const normalizedShippingAddress =
      normalizeShippingAddress(shippingAddress);

    const resolvedPaymentMethod =
      paymentMethod || "COD";

    // -----------------------------
    // Validate items
    // -----------------------------

    if (
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    // -----------------------------
    // Validate address
    // -----------------------------

    if (
      !normalizedShippingAddress.line1 ||
      !normalizedShippingAddress.city ||
      !normalizedShippingAddress.state ||
      !normalizedShippingAddress.postalCode
    ) {
      return res.status(400).json({
        success: false,
        message: "Complete shipping address is required",
      });
    }

    // -----------------------------
    // Normalize products
    // -----------------------------

    const {
      orderItems,
      subtotal,
      sellerIds,
    } = await normalizeOrderItems(items);

    // -----------------------------
    // Calculate total
    // -----------------------------

    const total =
      subtotal +
      Number(shippingCost) +
      Number(tax);

    // -----------------------------
    // Generate Order Number
    // -----------------------------

    const orderNumber = generateOrderNumber();

    // -----------------------------
    // Create Order
    // -----------------------------

    const order = await Order.create({
      orderNumber,

      user: userId,

      items: orderItems,

      shippingAddress: normalizedShippingAddress,

      paymentMethod: resolvedPaymentMethod,

      subtotal,

      shippingCost,

      tax,

      total,
    });

    // -----------------------------
    // Create Seller Notifications
    // -----------------------------

    if (sellerIds.length > 0) {
      await SellerNotification.insertMany(
        sellerIds.map((sellerId) => ({
          seller: sellerId,

          order: order._id,

          type: "NEW_ORDER",

          title: "New Order Received",

          message: `You have received a new order #${order.orderNumber}`,

          isRead: false,
        }))
      );
    }

    // -----------------------------
    // Response
    // -----------------------------

    return res.status(201).json({
      success: true,

      message: "Order placed successfully",

      order: {
        _id: order._id,

        orderNumber: order.orderNumber,

        total: order.total,

        paymentMethod: order.paymentMethod,
      },
    });

  } catch (error) {

    console.error("Place Order Error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.buyerOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ user: userId })
      .populate('items.product')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.orderHistory = exports.buyerOrders;

exports.orderDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findOne({ _id: req.params.id, user: userId }).populate('items.product');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.sellerOrders = async (req, res) => {
  try {
    const seller = await requireRole(req.user?.id, ['seller', 'admin']);
    const sellerProductIds = await getSellerProductIds(seller._id);

    if (sellerProductIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const orders = await Order.find({ 'items.product': { $in: sellerProductIds } })
      .populate('items.product')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.updateSellerOrderStatus = async (req, res) => {
  try {
    const seller = await requireRole(req.user?.id, ['seller', 'admin']);
    const { status } = req.body || {};

    if (!ORDER_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${ORDER_STATUS.join(', ')}` });
    }

    const sellerProductIds = await getSellerProductIds(seller._id);
    const order = await Order.findOne({
      _id: req.params.id,
      'items.product': { $in: sellerProductIds },
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.adminOrders = async (req, res) => {
  try {
    await requireRole(req.user?.id, ['admin']);
    const orders = await Order.find()
      .populate('items.product')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.adminOrderDetails = async (req, res) => {
  try {
    await requireRole(req.user?.id, ['admin']);
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('user', 'name email role');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findOne({ _id: req.params.id, user: userId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Order already cancelled' });
    }

    order.status = 'Cancelled';
    await order.save();
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBuyerOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await Order.findOne({ _id: req.params.id, user: userId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered orders can be deleted from history',
      });
    }

    await Order.deleteOne({ _id: order._id });
    return res.status(200).json({ success: true, message: 'Order removed from history' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
