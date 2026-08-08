const mongoose = require("mongoose");

const sellerNotificationSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "NEW_ORDER",
        "PAYMENT_SUCCESS",
        "SHIPMENT_CREATED",
        "ORDER_CANCELLED",
        "ORDER_RETURNED",
      ],
      default: "NEW_ORDER",
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SellerNotification",
  sellerNotificationSchema
);