const Product = require("../models/productModel");
const User = require("../models/userModel");
const Store = require("../models/storeModel");

const { isBase64Image } = require("../utils/imageHelper");
const {
  uploadBuffer,
  uploadBase64,
} = require("../utils/cloudinary");

/**
 * ---------------------------------------------------------
 * REQUIRE SELLER
 * ---------------------------------------------------------
 */
const requireSeller = async (userId) => {
  if (!userId) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }

  const seller = await User.findById(userId);

  if (!seller) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (seller.role !== "seller") {
    const error = new Error(
      "Only sellers can manage products"
    );

    error.status = 403;
    throw error;
  }

  return seller;
};

/**
 * ---------------------------------------------------------
 * GET ALL PRODUCTS
 * ---------------------------------------------------------
 */
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("seller", "name email")
      .populate(
        "store",
        "storeName slug logo"
      );

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error(
      "Get products error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch products",
    });
  }
};

/**
 * ---------------------------------------------------------
 * GET PRODUCT BY ID
 * ---------------------------------------------------------
 */
exports.getProductById = async (req, res) => {
  try {
    const product =
      await Product.findById(req.params.id)
        .populate(
          "seller",
          "name email"
        )
        .populate(
          "store",
          "storeName slug logo"
        );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(
      "Get product by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch product",
    });
  }
};

/**
 * ---------------------------------------------------------
 * GET SELLER PRODUCTS
 * ---------------------------------------------------------
 */
exports.getSellerProducts = async (req, res) => {
  try {
    const userId =
      req.user?._id || req.user?.id;

    const seller =
      await requireSeller(userId);

    const products =
      await Product.find({
        seller: seller._id,
      })
        .populate(
          "seller",
          "name email"
        )
        .populate(
          "store",
          "storeName slug logo"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error(
      "Get seller products error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch seller products",
    });
  }
};

/**
 * ---------------------------------------------------------
 * CREATE PRODUCT
 * ---------------------------------------------------------
 */
exports.createProduct = async (req, res) => {
  try {
    const userId =
      req.user?._id || req.user?.id;

    /**
     * Validate seller
     */
    const seller =
      await requireSeller(userId);

    const {
      name,
      description,
      category,
      brand,
      price,
      rating,
      stock,
    } = req.body || {};

    /**
     * Validate required fields
     */
    if (
      !name ||
      !category ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, category and price are required.",
      });
    }

    /**
     * Validate price
     */
    const productPrice =
      Number(price);

    if (
      !Number.isFinite(productPrice) ||
      productPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Price must be a valid positive number.",
      });
    }

    /**
     * Validate stock
     */
    const productStock =
      stock === undefined ||
      stock === ""
        ? 0
        : Number(stock);

    if (
      !Number.isInteger(productStock) ||
      productStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock must be a valid non-negative integer.",
      });
    }

    /**
     * Validate rating
     */
    const productRating =
      rating === undefined ||
      rating === ""
        ? 0
        : Number(rating);

    if (
      !Number.isFinite(productRating) ||
      productRating < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be a valid non-negative number.",
      });
    }

    /**
     * -----------------------------------------------------
     * FIND SELLER STORE
     * -----------------------------------------------------
     *
     * Store owner is the logged-in seller.
     *
     * We do NOT trust store ID from frontend.
     */
    const store =
      await Store.findOne({
        owner: seller._id,
      });

    if (!store) {
      return res.status(404).json({
        success: false,
        message:
          "Store not found. Please create your seller store first.",
      });
    }

    /**
     * -----------------------------------------------------
     * IMAGE UPLOAD
     * -----------------------------------------------------
     */
    let image = "";

    if (
      req.file &&
      req.file.buffer
    ) {
      const uploadResult =
        await uploadBuffer(
          req.file.buffer,
          req.file.mimetype
        );

      image =
        uploadResult.secure_url;
    } else if (
      req.body?.image &&
      isBase64Image(req.body.image)
    ) {
      const uploadResult =
        await uploadBase64(
          req.body.image
        );

      image =
        uploadResult.secure_url;
    } else {
      image =
        req.body?.image || "";
    }

    /**
     * -----------------------------------------------------
     * CREATE PRODUCT
     * -----------------------------------------------------
     */
    const product =
      await Product.create({
        name: name.trim(),
        description:
          description || "",
        category: category.trim(),
        brand: brand || "",
        price: productPrice,
        rating: productRating,
        stock: productStock,
        image,

        /**
         * Automatically assign logged-in seller
         */
        seller: seller._id,

        /**
         * Automatically assign seller's store
         */
        store: store._id,
      });

    /**
     * Populate response
     */
    await product.populate([
      {
        path: "seller",
        select: "name email",
      },
      {
        path: "store",
        select:
          "storeName slug logo",
      },
    ]);

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error(
      "Create product error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to create product",
    });
  }
};

/**
 * ---------------------------------------------------------
 * UPDATE PRODUCT
 * ---------------------------------------------------------
 */
exports.updateProduct = async (req, res) => {
  try {
    const userId =
      req.user?._id || req.user?.id;

    const product =
      await Product.findById(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /**
     * Seller authorization
     */
    if (
      product.seller.toString() !==
      userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Not authorized to update this product.",
      });
    }

    const {
      name,
      description,
      category,
      brand,
      price,
      rating,
      stock,
    } = req.body || {};

    const updateData = {};

    if (name !== undefined) {
      updateData.name =
        String(name).trim();
    }

    if (
      description !== undefined
    ) {
      updateData.description =
        description;
    }

    if (category !== undefined) {
      updateData.category =
        String(category).trim();
    }

    if (brand !== undefined) {
      updateData.brand = brand;
    }

    /**
     * Validate price
     */
    if (price !== undefined) {
      const productPrice =
        Number(price);

      if (
        !Number.isFinite(
          productPrice
        ) ||
        productPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Price must be a valid non-negative number.",
        });
      }

      updateData.price =
        productPrice;
    }

    /**
     * Validate rating
     */
    if (rating !== undefined) {
      const productRating =
        Number(rating);

      if (
        !Number.isFinite(
          productRating
        ) ||
        productRating < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rating must be a valid non-negative number.",
        });
      }

      updateData.rating =
        productRating;
    }

    /**
     * Validate stock
     */
    if (stock !== undefined) {
      const productStock =
        Number(stock);

      if (
        !Number.isInteger(
          productStock
        ) ||
        productStock < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock must be a valid non-negative integer.",
        });
      }

      updateData.stock =
        productStock;
    }

    /**
     * Image upload
     */
    if (
      req.file &&
      req.file.buffer
    ) {
      const uploadResult =
        await uploadBuffer(
          req.file.buffer,
          req.file.mimetype
        );

      updateData.image =
        uploadResult.secure_url;
    } else if (
      req.body?.image &&
      isBase64Image(req.body.image)
    ) {
      const uploadResult =
        await uploadBase64(
          req.body.image
        );

      updateData.image =
        uploadResult.secure_url;
    } else if (
      req.body?.image !== undefined
    ) {
      updateData.image =
        req.body.image;
    }

    /**
     * Do NOT allow seller/store
     * to be changed from frontend.
     */

    const updatedProduct =
      await Product.findOneAndUpdate(
        {
          _id: req.params.id,
          seller: userId,
        },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "seller",
          "name email"
        )
        .populate(
          "store",
          "storeName slug logo"
        );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or you are not authorized to update it.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to update product",
    });
  }
};

/**
 * ---------------------------------------------------------
 * DELETE PRODUCT
 * ---------------------------------------------------------
 */
exports.deleteProduct = async (req, res) => {
  try {
    const userId =
      req.user?._id || req.user?.id;

    const product =
      await Product.findOne({
        _id: req.params.id,
        seller: userId,
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or you are not authorized to delete it.",
      });
    }

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to delete product",
    });
  }
};