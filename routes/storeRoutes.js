const express = require("express");

const router = express.Router();

const {
  createStore,
  getMyStore,
  getStoreById,
  getStoreBySlug,
  updateMyStore,
  deleteMyStore,
} = require("../controllers/storeController");

const { protect } = require("../middleware/authMiddleware");

// Seller routes
router.post("/", protect, createStore);
router.get("/me", protect, getMyStore);
router.put("/me", protect, updateMyStore);
router.delete("/me", protect, deleteMyStore);
// Public routes
router.get("/slug/:slug", getStoreBySlug);
router.get("/:id", getStoreById);
module.exports = router;