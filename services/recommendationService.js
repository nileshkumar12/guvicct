const Product = require("../models/productModel");
const { searchProducts } = require("./productSearchService");
const { createHttpError } = require("../utils/chatbotRequest");

const getRecommendations = async ({
  productId,
  query = "",
  keyword = "",
  category = "",
  brand = "",
  minPrice = 0,
  maxPrice = Number.MAX_SAFE_INTEGER,
  limit = 8,
} = {}) => {
  let seedProduct = null;
  if (productId) {
    if (!/^[a-f\d]{24}$/i.test(String(productId))) {
      throw createHttpError(400, "productId must be a valid product ID.");
    }
    seedProduct = await Product.findOne({ _id: productId, status: "active" })
      .select("category subcategory brand price")
      .lean();
    if (!seedProduct) throw createHttpError(404, "Product not found.");
  }

  const targetCategory = category || seedProduct?.category || "";
  const targetBrand = brand || "";
  const targetQuery = query || keyword;
  const priceFloor = seedProduct
    ? Math.max(Number(minPrice) || 0, Number(seedProduct.price) * 0.6)
    : minPrice;
  const priceCeiling = seedProduct
    ? Math.min(Number(maxPrice) || Number.MAX_SAFE_INTEGER, Number(seedProduct.price) * 1.4)
    : maxPrice;

  const results = await searchProducts({
    keyword: targetQuery,
    category: targetCategory,
    brand: targetBrand,
    minPrice: priceFloor,
    maxPrice: priceCeiling,
    availability: true,
    limit: Math.min(50, Math.max(1, Number(limit) || 8) * 3),
  });

  let products = results.products.filter(
    (product) => !seedProduct || product.id !== String(productId)
  );
  if (targetQuery) {
    const tokens = targetQuery.toLowerCase().split(/\s+/).filter(Boolean);
    products = products.sort((a, b) => {
      const score = (product) => {
        const text = `${product.name} ${product.category} ${product.brand}`.toLowerCase();
        return tokens.reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0);
      };
      return score(b) - score(a) || b.rating - a.rating || a.price - b.price;
    });
  }

  return products.slice(0, Math.min(50, Math.max(1, Number(limit) || 8)));
};

module.exports = { getRecommendations };
