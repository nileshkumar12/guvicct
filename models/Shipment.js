const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
  },

  note: {
    type: String,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const shipmentSchema = new mongoose.Schema(
  {
    // Store the business order number instead of MongoDB Order _id
    orderNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    trackingNumber: {
      type: String,
      trim: true,
    },

    carrier: {
      type: String,
      enum: [
        "delhivery",
        "bluedart",
        "dtdc",
        "fedex",
        "ekart",
        "other",
      ],
      default: "other",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "returned",
        "cancelled",
      ],
      default: "pending",
    },

    shippingAddress: {
      name: {
        type: String,
        trim: true,
      },

      address: {
        type: String,
        trim: true,
      },

      city: {
        type: String,
        trim: true,
      },

      state: {
        type: String,
        trim: true,
      },

      pincode: {
        type: String,
        trim: true,
      },

      phone: {
        type: String,
        trim: true,
      },
    },

    estimatedDelivery: {
      type: Date,
    },

    statusHistory: [statusHistorySchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipment", shipmentSchema);