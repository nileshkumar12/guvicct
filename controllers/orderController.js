
const mongoose = require("mongoose");

const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const SellerNotification = require("../models/sellerNotificationModel");
const { sendOrderConfirmationEmail, sendShipmentUpdateEmail } = require("../utils/sendEmail");

const ORDER_STATUS = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

/**
 * ---------------------------------------------------------
 * HELPERS
 * ---------------------------------------------------------
 */

/**
 * Get authenticated user ID safely.
 */
const getUserId = (req) => {
  return req.user?._id || req.user?.id;
};

/**
 * Validate MongoDB ObjectId.
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Check user role.
 */
const requireRole = async (userId, allowedRoles) => {
  if (!userId) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (!allowedRoles.includes(user.role)) {
    const error = new Error(
      `Only ${allowedRoles.join(" or ")} can access this resource`
    );

    error.status = 403;
    throw error;
  }

  return user;
};

/**
 * Normalize and validate order items.
 *
 * IMPORTANT:
 * Price is always taken from the database.
 * Do NOT trust price sent by frontend.
 */
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

    /**
     * Validate product ID
     */
    if (!incomingProductId) {
      const error = new Error("Product ID is required");
      error.status = 400;
      throw error;
    }

    if (!isValidObjectId(incomingProductId)) {
      const error = new Error(
        `Invalid product ID: ${incomingProductId}`
      );

      error.status = 400;
      throw error;
    }

    /**
     * Get product from database
     */
    const product = await Product.findById(incomingProductId).select(
      "_id name price seller store stock"
    );

    if (!product) {
      const error = new Error(
        `Product not found: ${incomingProductId}`
      );

      error.status = 404;
      throw error;
    }

    // Legacy product documents may miss seller/store fields.
    // Return a client error instead of failing later with a 500.
    if (!product.seller || !isValidObjectId(product.seller)) {
      const error = new Error(
        `Product seller is missing for product: ${product.name}`
      );

      error.status = 400;
      throw error;
    }

    if (!product.store || !isValidObjectId(product.store)) {
      const error = new Error(
        `Product store is missing for product: ${product.name}`
      );

      error.status = 400;
      throw error;
    }

    /**
     * Validate quantity
     */
    const quantity = Number(item?.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error(
        `Invalid quantity for product: ${product.name}`
      );

      error.status = 400;
      throw error;
    }

    /**
     * Stock validation
     *
     * If your Product schema has a stock field,
     * this will prevent ordering more than available stock.
     */
    if (
      product.stock !== undefined &&
      product.stock !== null &&
      quantity > Number(product.stock)
    ) {
      const error = new Error(
        `Insufficient stock for product: ${product.name}. Available stock: ${product.stock}`
      );

      error.status = 400;
      throw error;
    }

    /**
     * IMPORTANT:
     * Always use price from database.
     *
     * Never use:
     * item.price
     */
    const price = Number(product.price);

    if (!Number.isFinite(price) || price < 0) {
      const error = new Error(
        `Invalid price for product: ${product.name}`
      );

      error.status = 400;
      throw error;
    }

    /**
     * Calculate subtotal
     */
    subtotal += price * quantity;

    /**
     * Store order item
     */
    orderItems.push({
      product: product._id,
      seller: product.seller,
      store: product.store,
      productName: product.name,
      quantity,
      price,
      total: price * quantity,
    });

    /**
     * Collect seller
     */
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

/**
 * Get all product IDs belonging to a seller.
 */
const getSellerProductIds = async (sellerId) => {
  const products = await Product.find({
    seller: sellerId,
  }).select("_id");

  return products.map((product) => product._id);
};

/**
 * Normalize shipping address.
 */
const normalizeShippingAddress = (shippingAddress = {}) => ({
  line1:
    shippingAddress.line1 ||
    shippingAddress.addressLine1 ||
    shippingAddress.address ||
    shippingAddress.street ||
    "",

  line2:
    shippingAddress.line2 ||
    shippingAddress.addressLine2 ||
    "",

  city:
    shippingAddress.city || "",

  state:
    shippingAddress.state || "",

  postalCode:
    shippingAddress.postalCode ||
    shippingAddress.zipCode ||
    shippingAddress.zip ||
    shippingAddress.pincode ||
    "",

  country:
    shippingAddress.country || "India",
});

/**
 * ---------------------------------------------------------
 * PLACE ORDER
 * ---------------------------------------------------------
 */

exports.placeOrder = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      items,
      shippingAddress,
      paymentMethod,
      shippingCost = 0,
      tax = 0,
      discount = 0,
    } = req.body || {};

    /**
     * -----------------------------------------------------
     * Validate items
     * -----------------------------------------------------
     */

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    /**
     * -----------------------------------------------------
     * Validate shipping address
     * -----------------------------------------------------
     */

    const normalizedShippingAddress =
      normalizeShippingAddress(shippingAddress);

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

    /**
     * -----------------------------------------------------
     * Payment method
     * -----------------------------------------------------
     */

    const resolvedPaymentMethod =
      paymentMethod || "COD";

    /**
     * -----------------------------------------------------
     * Normalize order items
     * -----------------------------------------------------
     */

    const {
      orderItems,
      subtotal,
      sellerIds,
    } = await normalizeOrderItems(items);

    /**
     * -----------------------------------------------------
     * Safe numeric values
     * -----------------------------------------------------
     */

    const safeSubtotal =
      Number.isFinite(Number(subtotal))
        ? Number(subtotal)
        : 0;

    const requestedDiscount =
      Number(discount) || 0;

    const safeShippingCost =
      Number(shippingCost) || 0;

    const safeTax =
      Number(tax) || 0;

    /**
     * Prevent negative values.
     */
    const positiveDiscount =
      Math.max(0, requestedDiscount);

    const positiveShippingCost =
      Math.max(0, safeShippingCost);

    const positiveTax =
      Math.max(0, safeTax);

    /**
     * Discount cannot exceed subtotal.
     */
    const safeDiscount = Math.min(
      positiveDiscount,
      safeSubtotal
    );

    /**
     * -----------------------------------------------------
     * Calculate total
     * -----------------------------------------------------
     */

    const total =
      safeSubtotal -
      safeDiscount +
      positiveShippingCost +
      positiveTax;

    /**
     * -----------------------------------------------------
     * CREATE ORDER
     *
     * orderNumber is generated by orderModel.
     * -----------------------------------------------------
     */

    const order = await Order.create({
      user: userId,

      items: orderItems,

      shippingAddress:
        normalizedShippingAddress,

      paymentMethod:
        resolvedPaymentMethod,

      subtotal:
        safeSubtotal,

      discount:
        safeDiscount,

      shippingCost:
        positiveShippingCost,

      tax:
        positiveTax,

      total,
    });

// =====================================================
// SEND BUYER ORDER CONFIRMATION EMAIL
// =====================================================

const responseOrder = await Order.findById(order._id)
  .populate("user", "name email");

// Return response immediately
res.status(201).json({
  success: true,
  message: "Order placed successfully",
  order: responseOrder,
});


// SEND EMAIL IN BACKGROUND
console.log("✅ ORDER CREATED:", order.orderNumber);


// =====================================================
// GET POPULATED ORDER
// =====================================================

const populatedOrder = await Order.findById(order._id)
  .populate("user", "name email");

console.log(
  " customer email:",
  populatedOrder?.user?.email
);


// =====================================================
// START EMAIL - DO NOT AWAIT
// =====================================================

if (populatedOrder?.user?.email) {

  sendOrderConfirmationEmail(populatedOrder)
    .then((info) => {

      console.log(
        "Order email sent:",
        populatedOrder.orderNumber
      );

      console.log(
        "message id:",
        info?.messageId
      );

    })
    .catch((error) => {

      console.error(
        "order error:",
        error.message
      );

    });

} else {

  console.error(
    "EMAIL NOT SENT - USER EMAIL NOT FOUND"
  );

}

    /**
     * -----------------------------------------------------
     * SELLER NOTIFICATIONS
     * -----------------------------------------------------
     */

    if (sellerIds.length > 0) {
      const notifications = sellerIds.map(
        (sellerId) => ({
          seller: sellerId,

          order: order._id,

          type: "NEW_ORDER",

          title: "New Order Received",

          message:
            `You have received a new order #${order.orderNumber}`,

          isRead: false,
        })
      );

      try {
        await SellerNotification.insertMany(
          notifications
        );
      } catch (notifyError) {
        // Notification issues should not fail order placement.
        console.error(
          "Seller notification error:",
          notifyError
        );
      }
    }
   
    /**
     * -----------------------------------------------------
     * RESPONSE
     * -----------------------------------------------------
     */
    

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",

      order: {
        _id: order._id,

        orderNumber:
          order.orderNumber,

        subtotal:
          order.subtotal,

        discount:
          order.discount,

        shippingCost:
          order.shippingCost,

        tax:
          order.tax,

        total:
          order.total,

        paymentMethod:
          order.paymentMethod,

        status:
          order.status,

        shippingAddress:
          order.shippingAddress,

        createdAt:
          order.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Place order error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to place order",
    });
  }
};

/**
 * ---------------------------------------------------------
 * BUYER - ORDER HISTORY
 * ---------------------------------------------------------
 */

exports.buyerOrders = async (req, res) => {
  try {
    const userId = getUserId(req);

    // Seller dashboard in some clients calls /api/orders with seller context.
    // Route it to seller order listing to avoid wrong handler usage.
    if (
      req.user?.role === "seller" ||
      req.query?.sellerId
    ) {
      return exports.sellerOrders(
        req,
        res
      );
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orders = await Order.find({
      user: userId,
    })
      .populate("items.product")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error(
      "Buyer orders error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch orders",
    });
  }
};

/**
 * Alias
 */
exports.orderHistory =
  exports.buyerOrders;

/**
 * ---------------------------------------------------------
 * BUYER - ORDER DETAILS
 * ---------------------------------------------------------
 */

exports.orderDetails = async (req, res) => {
  try {
    const userId = getUserId(req);
    const orderId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    }).populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error(
      "Order details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch order details",
    });
  }
};

/**
 * ---------------------------------------------------------
 * SELLER - ORDER LIST
 * ---------------------------------------------------------
 */

exports.sellerOrders = async (req, res) => {
  try {
    const userId = getUserId(req);

    const seller = await requireRole(
      userId,
      ["seller", "admin"]
    );

    const sellerProductIds =
      await getSellerProductIds(
        seller._id
      );

    /**
     * Seller has no products.
     */
    if (sellerProductIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const orders = await Order.find({
      "items.product": {
        $in: sellerProductIds,
      },
    })
      .populate("items.product")
      .populate(
        "user",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error(
      "Seller orders error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch seller orders",
    });
  }
};

/**
 * ---------------------------------------------------------
 * SELLER - UPDATE ORDER STATUS
 * ---------------------------------------------------------
 */

exports.updateSellerOrderStatus =
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const orderId = req.params.id;

      const seller = await requireRole(
        userId,
        ["seller", "admin"]
      );

      const { status } =
        req.body || {};

      /**
       * Validate status.
       */
      if (!ORDER_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            `status must be one of: ${ORDER_STATUS.join(
              ", "
            )}`,
        });
      }

      /**
       * Validate order ID.
       */
      if (!isValidObjectId(orderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID",
        });
      }

      /**
       * Get seller products.
       */
      const sellerProductIds =
        await getSellerProductIds(
          seller._id
        );

      if (
        sellerProductIds.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "No products found for this seller",
        });
      }

      /**
       * Find order containing
       * seller's product.
       */
      const order =
        await Order.findOne({
          _id: orderId,

          "items.product": {
            $in: sellerProductIds,
          },
        }).populate(
          "items.product"
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      /**
       * Prevent invalid status transitions.
       */
      if (
        order.status === "Cancelled" &&
        status !== "Cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cancelled orders cannot be updated",
        });
      }

      if (
        order.status === "Delivered" &&
        status !== "Delivered"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Delivered orders cannot be changed",
        });
      }

      /**
       * Update order status.
       *
       * NOTE:
       * This updates the whole Order status.
       * If your application supports multiple
       * sellers inside one order, use a separate
       * sellerOrder/status field in the schema
       * for true per-seller status tracking.
       */
      order.status = status;

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      console.error(
        "Update seller order status error:",
        error
      );

      return res.status(
        error.status || 500
      ).json({
        success: false,
        message:
          error.message ||
          "Failed to update order status",
      });
    }
  };

/**
 * ---------------------------------------------------------
 * ADMIN - ALL ORDERS
 * ---------------------------------------------------------
 */

exports.adminOrders = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    await requireRole(
      userId,
      ["admin"]
    );

    const orders =
      await Order.find()
        .populate("items.product")
        .populate(
          "user",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error(
      "Admin orders error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch orders",
    });
  }
};

/**
 * ---------------------------------------------------------
 * ADMIN - ORDER DETAILS
 * ---------------------------------------------------------
 */

exports.adminOrderDetails =
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const orderId = req.params.id;

      await requireRole(
        userId,
        ["admin"]
      );

      if (!isValidObjectId(orderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID",
        });
      }

      const order =
        await Order.findById(orderId)
          .populate(
            "items.product"
          )
          .populate(
            "user",
            "name email role"
          );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error(
        "Admin order details error:",
        error
      );

      return res.status(
        error.status || 500
      ).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch order details",
      });
    }
  };

/**
 * ---------------------------------------------------------
 * BUYER - CANCEL ORDER
 * ---------------------------------------------------------
 */

exports.cancelOrder = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);
    const orderId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order =
      await Order.findOne({
        _id: orderId,
        user: userId,
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    /**
     * Already cancelled
     */
    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "Order already cancelled",
      });
    }

    /**
     * Cannot cancel shipped/delivered orders.
     */
    if (
      ["Shipped", "Delivered"].includes(
        order.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Order cannot be cancelled after it is ${order.status.toLowerCase()}`,
      });
    }

    order.status = "Cancelled";

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error(
      "Cancel order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to cancel order",
    });
  }
};

/**
 * ---------------------------------------------------------
 * BUYER - DELETE ORDER HISTORY
 * ---------------------------------------------------------
 *
 * Only Delivered orders can be removed.
 */

exports.deleteBuyerOrderHistory =
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const orderId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      if (!isValidObjectId(orderId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order ID",
        });
      }

      const order =
        await Order.findOne({
          _id: orderId,
          user: userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      /**
       * Only delivered orders
       * can be removed.
       */
      if (order.status !== "Delivered") {
        return res.status(400).json({
          success: false,
          message:
            "Only delivered orders can be deleted from history",
        });
      }

      await Order.deleteOne({
        _id: order._id,
      });

      return res.status(200).json({
        success: true,
        message:
          "Order removed from history",
      });
    } catch (error) {
      console.error(
        "Delete buyer order history error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to delete order history",
      });
    }
  };

