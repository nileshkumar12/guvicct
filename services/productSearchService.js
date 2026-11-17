const Product = require("../models/productModel");
const Store = require("../models/storeModel");
const { createHttpError } = require("../utils/chatbotRequest");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAvailableVariants = (variants = []) =>
  variants.filter((variant) => Number(variant.stock) > 0);

const formatProduct = (
  product,
  minPrice = 0,
  maxPrice = Number.MAX_SAFE_INTEGER,
  availableOnly = false
) => {
  const variants = (product.variants || []).map((variant) => ({
    id: String(variant._id),
    name: variant.name || "",
    sku: variant.sku || "",
    price: Number(variant.price),
    stock: Number(variant.stock),
    available: Number(variant.stock) > 0,
    attributes:
      variant.attributes instanceof Map
        ? Object.fromEntries(variant.attributes)
        : variant.attributes || {},
    image: variant.image || variant.images?.[0] || null,
  }));
  const availableVariants = getAvailableVariants(variants);
  const prices = [
    ...(availableOnly && Number(product.stock) <= 0 ? [] : [Number(product.price)]),
    ...variants
      .filter((variant) => !availableOnly || variant.available)
      .map((variant) => variant.price),
  ]
    .filter((value) => Number.isFinite(value) && value >= minPrice && value <= maxPrice);
  const price = prices.length ? Math.min(...prices) : Number(product.price);
  const stock = Number(product.stock || 0);

  return {
    id: String(product._id),
    name: product.name,
    description: product.description || "",
    category: product.category || "",
    subcategory: product.subcategory || "",
    brand: typeof product.brand === "string" ? product.brand : product.brand?.name || "",
    price,
    image: product.image || product.images?.[0] || null,
    images: product.images || [],
    stock,
    available: stock > 0 || availableVariants.length > 0,
    variants,
    specifications: (product.specifications || []).map((item) => ({
      name: item.name,
      value: item.value,
      unit: item.unit || "",
    })),
    vendor: product.store?.storeName || "",
    rating: Number(product.rating || 0),
  };
};

const searchProducts = async ({
  keyword = "",
  query = "",
  minPrice = 0,
  maxPrice = Number.MAX_SAFE_INTEGER,
  category = "",
  subcategory = "",
  brand = "",
  vendor = "",
  availability,
  page = 1,
  limit = 8,
} = {}) => {
  const searchTerm = String(keyword || query).trim();
  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < min) {
    throw createHttpError(400, "Invalid product price range.");
  }

  const productFilter = { status: "active" };
  const constraints = [];

  if (searchTerm) {
    const expression = new RegExp(escapeRegex(searchTerm), "i");
    constraints.push({
      $or: [
        { name: expression },
        { description: expression },
        { brand: expression },
        { category: expression },
        { subcategory: expression },
      ],
    });
  }
  if (category) constraints.push({ category: new RegExp(escapeRegex(String(category)), "i") });
  if (subcategory) {
    constraints.push({
      subcategory: new RegExp(escapeRegex(String(subcategory)), "i"),
    });
  }
  if (brand) constraints.push({ brand: new RegExp(escapeRegex(String(brand)), "i") });

  if (vendor) {
    const stores = await Store.find({
      status: "active",
      storeName: new RegExp(escapeRegex(String(vendor)), "i"),
    })
      .select("_id")
      .limit(50)
      .lean();
    if (!stores.length) return { products: [], page, limit, total: 0 };
    constraints.push({ store: { $in: stores.map((store) => store._id) } });
  }

  if (availability === true) {
    constraints.push({
      $or: [
        { price: { $gte: min, $lte: max }, stock: { $gt: 0 } },
        {
          variants: {
            $elemMatch: {
              price: { $gte: min, $lte: max },
              stock: { $gt: 0 },
            },
          },
        },
      ],
    });
  } else if (availability === false) {
    constraints.push({
      $or: [
        { price: { $gte: min, $lte: max } },
        { variants: { $elemMatch: { price: { $gte: min, $lte: max } } } },
      ],
    });
    constraints.push({
      stock: { $lte: 0 },
      variants: { $not: { $elemMatch: { stock: { $gt: 0 } } } },
    });
  } else {
    constraints.push({
      $or: [
        { price: { $gte: min, $lte: max } },
        { variants: { $elemMatch: { price: { $gte: min, $lte: max } } } },
      ],
    });
  }

  if (constraints.length) productFilter.$and = constraints;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 8));
  const [results, total] = await Promise.all([
    Product.find(productFilter)
      .select(
        "name description category subcategory brand price image images stock variants specifications rating store"
      )
      .populate({ path: "store", select: "storeName status" })
      .sort({ rating: -1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Product.countDocuments(productFilter),
  ]);

  const products = results
    .map((product) => formatProduct(product, min, max, availability === true))
    .filter((product) => product.price >= min && product.price <= max)
    .sort((left, right) => right.rating - left.rating || left.price - right.price);

  return { products, page: safePage, limit: safeLimit, total };
};

module.exports = { searchProducts, formatProduct };
