const express = require("express");

const router = express.Router();

const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleHelpful,
} = require("../controllers/reviewController");

const authMiddleware = require("../middleware/authMiddleware");

// ==========================================
// PRODUCT REVIEWS
// ==========================================

// GET
// /api/products/:productId/reviews
router.get(
  "/products/:productId/reviews",
  getProductReviews
);

// POST
// /api/products/:productId/reviews
router.post(
  "/products/:productId/reviews",
  authMiddleware,
  createReview
);

// ==========================================
// SINGLE REVIEW
// ==========================================

// PUT
// /api/reviews/:reviewId
router.put(
  "/reviews/:reviewId",
  authMiddleware,
  updateReview
);

// DELETE
// /api/reviews/:reviewId
router.delete(
  "/reviews/:reviewId",
  authMiddleware,
  deleteReview
);

// ==========================================
// HELPFUL
// ==========================================

// POST
// /api/reviews/:reviewId/helpful
router.post(
  "/reviews/:reviewId/helpful",
  authMiddleware,
  toggleHelpful
);

module.exports = router;