const Shipment = require("../models/Shipment");
const Order = require("../models/orderModel");
const { sendShipmentUpdateEmail } = require("../utils/sendEmail");

// =====================================================
// CREATE SHIPMENT
// POST /api/shipments
// =====================================================
exports.createShipment = async (req, res) => {
  try {
    const {
      orderNumber,
      carrier,
      trackingNumber,
      estimatedDelivery,
      shippingAddress,
      status,
    } = req.body;

    // ---------------------------------------------
    // Validate order number
    // ---------------------------------------------
    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Order number is required",
      });
    }

    // ---------------------------------------------
    // Validate seller
    // ---------------------------------------------
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Seller authentication required",
      });
    }

    // ---------------------------------------------
    // Find order using orderNumber
    // ---------------------------------------------
    const order = await Order.findOne({
      orderNumber: orderNumber,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order ${orderNumber} not found`,
      });
    }

    // ---------------------------------------------
    // Check existing shipment
    // ---------------------------------------------
    const existingShipment = await Shipment.findOne({
      orderNumber: orderNumber,
    });

    if (existingShipment) {
      return res.status(400).json({
        success: false,
        message: "Shipment already exists for this order",
      });
    }

    // ---------------------------------------------
    // Create shipment
    // ---------------------------------------------
    const shipment = await Shipment.create({
      orderNumber: orderNumber,
      sellerId: req.user._id,

      trackingNumber: trackingNumber || "",

      carrier: carrier || "other",

      status: status || "pending",

      shippingAddress: {
        name: shippingAddress?.name || "",
        address: shippingAddress?.address || "",
        city: shippingAddress?.city || "",
        state: shippingAddress?.state || "",
        pincode: shippingAddress?.pincode || "",
        phone: shippingAddress?.phone || "",
      },

      estimatedDelivery: estimatedDelivery || null,

      statusHistory: [
        {
          status: status || "pending",
          note: "Shipment created",
          updatedAt: new Date(),
        },
      ],
    });

    // ---------------------------------------------
    // Update Order status
    // ---------------------------------------------
    await Order.findByIdAndUpdate(order._id, {
      status: status || "pending",
    });

    // ---------------------------------------------
    // Response
    // ---------------------------------------------
    return res.status(201).json({
      success: true,
      message: "Shipment created successfully",
      shipment,
    });
  } catch (error) {
    console.error("Create Shipment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create shipment",
    });
  }
};

// =====================================================
// GET SELLER SHIPMENTS
// GET /api/shipments
// =====================================================
exports.getSellerShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find({
      sellerId: req.user._id,
    })
      .populate("sellerId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      shipments,
    });
  } catch (error) {
    console.error("Get Shipments Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch shipments",
    });
  }
};

// =====================================================
// GET SHIPMENT BY ID
// GET /api/shipments/:shipmentId
// =====================================================
exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.shipmentId,
      sellerId: req.user._id,
    }).populate("sellerId", "name email");

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    return res.status(200).json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error("Get Shipment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch shipment",
    });
  }
};

// =====================================================
// UPDATE SHIPMENT STATUS
// PUT /api/shipments/:shipmentId/status
// =====================================================
exports.updateShipmentStatus = async (req, res) => {
  try {
    const {
      status,
      trackingNumber,
      carrier,
      note,
    } = req.body;

    // ---------------------------------------------
    // Find shipment
    // ---------------------------------------------
    const shipment = await Shipment.findOne({
      _id: req.params.shipmentId,
      sellerId: req.user._id,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    // ---------------------------------------------
    // Update shipment
    // ---------------------------------------------
    if (status) {
      shipment.status = status;
    }

    if (trackingNumber) {
      shipment.trackingNumber = trackingNumber;
    }

    if (carrier) {
      shipment.carrier = carrier;
    }

    shipment.statusHistory.push({
      status: status || shipment.status,
      note: note || "",
      updatedAt: new Date(),
    });

    await shipment.save();

    // ---------------------------------------------
    // Find order by orderNumber
    // ---------------------------------------------
    const order = await Order.findOne({
      orderNumber: shipment.orderNumber,
    }).populate("user", "name email");

    // ---------------------------------------------
    // Update order status
    // ---------------------------------------------
    if (order && status) {
      order.status = status;
      await order.save();
    }

    // ---------------------------------------------
    // Send email
    // ---------------------------------------------
    if (order?.user?.email) {
      try {
        await sendShipmentUpdateEmail({
          email: order.user.email,
          name: order.user.name,
          orderNumber: order.orderNumber,
          status: shipment.status,
          trackingNumber: shipment.trackingNumber,
          carrier: shipment.carrier,
        });
      } catch (emailError) {
        console.error(
          "Shipment email failed:",
          emailError.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Shipment status updated successfully",
      shipment,
    });
  } catch (error) {
    console.error("Update Shipment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update shipment",
    });
  }
};

// =====================================================
// TRACK SHIPMENT
// GET /api/shipments/:trackingNumber/track
// =====================================================
exports.trackShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      trackingNumber: req.params.trackingNumber,
    }).populate("sellerId", "name email");

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    return res.status(200).json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error("Track Shipment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to track shipment",
    });
  }
};

// =====================================================
// CANCEL SHIPMENT
// PUT /api/shipments/:shipmentId/cancel
// =====================================================
exports.cancelShipment = async (req, res) => {
  try {
    const { reason } = req.body;

    const shipment = await Shipment.findOne({
      _id: req.params.shipmentId,
      sellerId: req.user._id,
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    if (shipment.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a delivered shipment",
      });
    }

    // ---------------------------------------------
    // Update shipment
    // ---------------------------------------------
    shipment.status = "cancelled";

    shipment.statusHistory.push({
      status: "cancelled",
      note: reason || "Shipment cancelled",
      updatedAt: new Date(),
    });

    await shipment.save();

    // ---------------------------------------------
    // Update Order using orderNumber
    // ---------------------------------------------
    const order = await Order.findOne({
      orderNumber: shipment.orderNumber,
    });

    if (order) {
      order.status = "cancelled";
      await order.save();
    }

    return res.status(200).json({
      success: true,
      message: "Shipment cancelled successfully",
      shipment,
    });
  } catch (error) {
    console.error("Cancel Shipment Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel shipment",
    });
  }
};