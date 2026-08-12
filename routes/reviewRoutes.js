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

// GET /api/products/:productId/reviews
router.get("/products/:productId/reviews", getProductReviews);

// Aliases for alternative frontend URL patterns
// GET /api/reviews/product/:productId
router.get("/reviews/product/:productId", (req, res, next) => {
  req.params.productId = req.params.productId;
  next();
}, getProductReviews);

// GET /api/products/:productId/comments
router.get("/products/:productId/comments", getProductReviews);

// GET /api/reviews?productId=...
router.get("/reviews", (req, res, next) => {
  const productId = req.query.productId || req.query.product;
  if (!productId) return res.status(400).json({ success: false, message: "productId is required" });
  req.params.productId = productId;
  next();
}, getProductReviews);

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