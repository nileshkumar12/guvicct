const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  placeOrder,
  buyerOrders,
  orderDetails,
  sellerOrders,
  updateSellerOrderStatus,
  adminOrders,
  adminOrderDetails,
  cancelOrder,
  deleteBuyerOrderHistory,sellerOrderById,
} = require("../controllers/orderController");

// Buyer
router.post("/", authMiddleware, placeOrder);
router.get("/", authMiddleware, buyerOrders);
router.get("/:id", authMiddleware, orderDetails);
router.put( "/:id/cancel", authMiddleware, cancelOrder);
router.delete( "/:id/history", authMiddleware, deleteBuyerOrderHistory);
router.get("/seller/orders/:orderId", authMiddleware, sellerOrderById);
// Seller
router.get(  "/seller/orders", authMiddleware, sellerOrders);
router.put( "/seller/orders/:id/status", authMiddleware, updateSellerOrderStatus);

// Admin
router.get(
  "/admin/orders",
  authMiddleware,
  adminOrders
);

router.get(
  "/admin/orders/:id",
  authMiddleware,
  adminOrderDetails
);

module.exports = router;