const mongoose = require("mongoose");
const Review = require("../models/reviewModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");


// create a new review
exports.createReview = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { productId } = req.params;

    const {
      rating,
      title,
      comment,
      images = [],
    } = req.body;

    // Validate product ID
    if (
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Validate rating
    if (
      rating === undefined ||
      Number(rating) < 1 ||
      Number(rating) > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // Validate title
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Review title is required",
      });
    }

    // Validate comment
    if (!comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required",
      });
    }

    // Find product
    const product = await Product.findById(
      productId
    ).select("seller store");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Make sure product has seller/store
    if (!product.seller) {
      return res.status(400).json({
        success: false,
        message:
          "Product does not have a seller assigned",
      });
    }

    if (!product.store) {
      return res.status(400).json({
        success: false,
        message:
          "Product does not have a store assigned",
      });
    }

    // Check existing review
    const existingReview =
      await Review.findOne({
        product: productId,
        user: userId,
      });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message:
          "You have already reviewed this product",
      });
    }

    const productObjectId = mongoose.Types.ObjectId.isValid(productId)
      ? new mongoose.Types.ObjectId(productId)
      : null;

    if (!productObjectId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Optional purchase validation for verified reviews.
    // Do not block product-page reviews when the user has not placed an order yet.
    const order = await Order.findOne({
      $and: [
        {
          $or: [
            { user: userId },
            { buyer: userId },
          ],
        },
        {
          "items.product": productObjectId,
        },
        {
          status: { $nin: ["Cancelled", "cancelled"] },
        },
      ],
    }).select("_id items status");

    const isVerifiedPurchase = Boolean(order);

    // Create review
    const review = await Review.create({
      product: product._id,

      seller: product.seller,

      store: product.store,

      user: userId,

      rating: Number(rating),

      title: title.trim(),

      comment: comment.trim(),

      images: Array.isArray(images)
        ? images
        : [],

      verifiedPurchase: isVerifiedPurchase,

      status: "APPROVED",
    });

    // Return populated review
    const populatedReview =
      await Review.findById(review._id)
        .populate("user", "name profilePic")
        .populate("seller", "name")
        .populate("store", "storeName logo");

    return res.status(201).json({
      success: true,
      message:
        "Review submitted successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.error(
      "CREATE REVIEW ERROR:",
      error
    );

    // Duplicate key
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "You have already reviewed this product",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create review",
    });
  }
};
// get product reviews
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const page = Math.max(
      parseInt(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      parseInt(req.query.limit) || 10,
      50
    );

    const skip = (page - 1) * limit;

    const filter = {
      product: productId,
      status: "APPROVED",
    };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name profilePic")
        .populate("seller", "name")
        .populate("store", "storeName logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Review.countDocuments(filter),
    ]);

    // Rating breakdown
    const ratingStats = await Review.aggregate([
      {
        $match: {
          product: new mongoose.Types.ObjectId(
            productId
          ),
          status: "APPROVED",
        },
      },
      {
        $group: {
          _id: "$rating",
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const breakdown = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratingStats.forEach((item) => {
      breakdown[item._id] = item.count;
    });

    // Average rating
    const ratingResult =
      await Review.aggregate([
        {
          $match: {
            product:
              new mongoose.Types.ObjectId(
                productId
              ),
            status: "APPROVED",
          },
        },
        {
          $group: {
            _id: null,
            averageRating: {
              $avg: "$rating",
            },
            totalReviews: {
              $sum: 1,
            },
          },
        },
      ]);

    const averageRating =
      ratingResult.length > 0
        ? Number(
            ratingResult[0].averageRating.toFixed(1)
          )
        : 0;

    return res.status(200).json({
      success: true,

      reviews,

      rating: {
        average: averageRating,
        total: total,
        breakdown,
      },

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage:
          page * limit < total,
      },
    });
  } catch (error) {
    console.error(
      "GET PRODUCT REVIEWS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

//update review
exports.updateReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reviewId } = req.params;

    const {
      rating,
      title,
      comment,
      images,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message:
          "Review not found or you are not the owner",
      });
    }

    // Rating
    if (rating !== undefined) {
      if (
        Number(rating) < 1 ||
        Number(rating) > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rating must be between 1 and 5",
        });
      }

      review.rating = Number(rating);
    }

    // Title
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Review title cannot be empty",
        });
      }

      review.title = title.trim();
    }

    // Comment
    if (comment !== undefined) {
      if (!comment.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Review comment cannot be empty",
        });
      }

      review.comment = comment.trim();
    }

    // Images
    if (images !== undefined) {
      review.images = Array.isArray(images)
        ? images
        : [];
    }

    await review.save();

    const updatedReview =
      await Review.findById(review._id)
        .populate("user", "name profilePic")
        .populate("seller", "name")
        .populate("store", "storeName logo");

    return res.status(200).json({
      success: true,
      message:
        "Review updated successfully",
      review: updatedReview,
    });
  } catch (error) {
    console.error(
      "UPDATE REVIEW ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update review",
    });
  }
};


// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reviewId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const review = await Review.findOne({
      _id: reviewId,
      user: userId,
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message:
          "Review not found or you are not the owner",
      });
    }

    await Review.deleteOne({
      _id: reviewId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Review deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE REVIEW ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};

// Helpful review
exports.toggleHelpful = async (req, res) => {
  try {
    const userId = req.user._id;
    const { reviewId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const review = await Review.findById(
      reviewId
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const userIndex =
      review.helpfulBy.findIndex(
        (id) =>
          id.toString() ===
          userId.toString()
      );

    let helpful;

    if (userIndex !== -1) {
      // Remove helpful vote
      review.helpfulBy.splice(
        userIndex,
        1
      );

      helpful = false;
    } else {
      // Add helpful vote
      review.helpfulBy.push(userId);

      helpful = true;
    }

    review.helpfulCount =
      review.helpfulBy.length;

    await review.save();

    return res.status(200).json({
      success: true,

      message: helpful
        ? "Review marked as helpful"
        : "Helpful vote removed",

      helpful,

      helpfulCount:
        review.helpfulCount,
    });
  } catch (error) {
    console.error(
      "HELPFUL REVIEW ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update helpful vote",
    });
  }
};