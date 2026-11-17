const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Shipment = require("../models/Shipment");
const { createHttpError } = require("../utils/chatbotRequest");

const formatOrder = async (order) => {
  const shipment = await Shipment.findOne({ orderNumber: order.orderNumber })
    .select("trackingNumber carrier status estimatedDelivery")
    .lean();

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: Number(order.grandTotal ?? order.total),
    items: (order.items || []).map((item) => ({
      name: item.productName,
      quantity: item.quantity,
    })),
    createdAt: order.createdAt,
    shipment: shipment
      ? {
          trackingNumber: shipment.trackingNumber || "",
          carrier: shipment.carrier || "",
          status: shipment.status || "",
          estimatedDelivery: shipment.estimatedDelivery || null,
        }
      : null,
  };
};

const getCustomerOrders = async (userId, orderIdentifier) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw createHttpError(401, "Authentication required.");
  }

  const filter = { user: userId };
  if (orderIdentifier) {
    const identifier = String(orderIdentifier).trim();
    if (/^[a-f\d]{24}$/i.test(identifier)) {
      filter._id = identifier;
    } else {
      filter.orderNumber = identifier;
    }
  }

  const orders = await Order.find(filter)
    .select(
      "orderNumber status paymentStatus paymentMethod items.productName items.quantity grandTotal total createdAt"
    )
    .sort({ createdAt: -1 })
    .limit(orderIdentifier ? 1 : 5)
    .lean();

  return Promise.all(orders.map(formatOrder));
};

module.exports = { getCustomerOrders };
