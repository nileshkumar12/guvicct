const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const mongoose = require('mongoose');

const getUserId = (req) => req.user?._id || req.user?.id;

const createError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const toAttributeObject = (attributes) => {
  if (attributes instanceof Map) return Object.fromEntries(attributes);
  if (attributes?.toObject) return attributes.toObject();
  return attributes && typeof attributes === 'object' && !Array.isArray(attributes)
    ? attributes
    : {};
};

const attributesMatch = (left, right) => {
  const leftEntries = Object.entries(toAttributeObject(left)).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(toAttributeObject(right)).sort(([a], [b]) => a.localeCompare(b));
  return leftEntries.length === rightEntries.length && leftEntries.every(
    ([key, value], index) => key === rightEntries[index][0] && String(value) === String(rightEntries[index][1])
  );
};

const normalizeCartItem = (product, input, quantity = input?.quantity ?? input?.qty ?? 1) => {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw createError(`Invalid quantity for product: ${product.name}`);
  }

  const variantInput = input?.variant && typeof input.variant === 'object' ? input.variant : {};
  const selectedVariantValue = input?.selectedVariant;
  const selectedVariantInput = selectedVariantValue && typeof selectedVariantValue === 'object'
    ? selectedVariantValue
    : {};
  const requestedVariantId = String(
    input?.variantId || input?.variant_id || variantInput.variantId || variantInput._id ||
    variantInput.id || selectedVariantInput.variantId || selectedVariantInput._id ||
    selectedVariantInput.id || (typeof selectedVariantValue === 'string' ? selectedVariantValue : '') || ''
  ).trim();
  const requestedSku = String(
    input?.variantSku || input?.variantSKU || input?.sku || variantInput.sku || selectedVariantInput.sku || ''
  ).trim();
  const requestedAttributes = input?.variantAttributes || input?.selectedAttributes ||
    variantInput.attributes || selectedVariantInput.attributes || input?.attributes || {};
  const hasAttributes = Object.keys(toAttributeObject(requestedAttributes)).length > 0;
  const variants = product.variants || [];
  let variant = null;

  if (variants.length && !requestedVariantId && !requestedSku && !hasAttributes) {
    throw createError(`A variant must be selected for product: ${product.name}`);
  }

  if (requestedVariantId) {
    variant = variants.find((candidate) => {
      const id = String(candidate._id || candidate.id || candidate.variantId || '').trim();
      return requestedVariantId === id || requestedVariantId === String(candidate.sku || '').trim();
    });
  }
  if (!variant && requestedSku) {
    variant = variants.find((candidate) => requestedSku === String(candidate.sku || '').trim());
  }
  if (!variant && hasAttributes) {
    variant = variants.find((candidate) => attributesMatch(candidate.attributes, requestedAttributes));
  }
  if ((requestedVariantId || requestedSku || hasAttributes) && !variant) {
    throw createError(`Selected variant not found for product: ${product.name}`);
  }

  const requestedAddons = input?.addons ?? input?.selectedAddons ?? [];
  if (!Array.isArray(requestedAddons)) {
    throw createError(`Invalid addons for product: ${product.name}`);
  }

  const selectedAddons = new Map();
  for (const selection of requestedAddons) {
    const addonId = typeof selection === 'object' && selection !== null
      ? selection.addonId || selection._id || selection.id
      : selection;
    const addon = (product.addons || []).find((candidate) => String(candidate._id) === String(addonId));
    if (!addon || addon.status !== 'active') {
      throw createError(`Selected addon is unavailable for product: ${product.name}`);
    }

    const addonQuantity = Number(typeof selection === 'object' && selection !== null
      ? selection.quantity ?? 1
      : 1);
    const previous = selectedAddons.get(String(addon._id));
    const combinedQuantity = addonQuantity + (previous?.quantity || 0);
    if (
      !Number.isInteger(addonQuantity) ||
      addonQuantity < 1 ||
      combinedQuantity > Number(addon.maxQuantity || 1)
    ) {
      throw createError(`Invalid addon quantity for ${addon.name}`);
    }

    selectedAddons.set(String(addon._id), {
      addonId: addon._id,
      name: addon.name,
      price: Number(addon.price),
      quantity: combinedQuantity,
      total: Number(addon.price) * combinedQuantity,
    });
  }

  const price = Number(variant?.price ?? product.price);
  if (!Number.isFinite(price) || price < 0) {
    throw createError(`Invalid price for product: ${product.name}`);
  }

  const addons = [...selectedAddons.values()];
  const addonTotal = addons.reduce((sum, addon) => sum + addon.total, 0);
  const selectedAttributes = variant ? toAttributeObject(variant.attributes) : {};
  const brand = product.brand && typeof product.brand === 'object'
    ? product.brand
    : { name: product.brand || '' };
  const variantId = variant?._id && mongoose.Types.ObjectId.isValid(variant._id)
    ? variant._id
    : null;

  return {
    product: product._id,
    productName: product.name,
    productImage: product.image || product.images?.[0] || '',
    brand: {
      brandId: brand._id && mongoose.Types.ObjectId.isValid(brand._id) ? brand._id : null,
      name: brand.name || '',
      slug: brand.slug || '',
      logo: brand.logo || brand.image || '',
    },
    variant: variant ? {
      variantId,
      sku: variant.sku || '',
      name: variant.name || Object.entries(selectedAttributes).map(([key, value]) => `${key}: ${value}`).join(' / '),
      attributes: selectedAttributes,
      price,
      image: variant.image || variant.images?.[0] || '',
      images: variant.images || [],
    } : null,
    variantId,
    variantSku: variant?.sku || '',
    selectedAttributes,
    addons,
    quantity: qty,
    price,
    addonTotal,
    total: (price + addonTotal) * qty,
  };
};

const getProductId = (item) => {
  const rawProduct = item?.productId || item?.product || item?._id;
  return typeof rawProduct === 'object' && rawProduct !== null
    ? rawProduct._id || rawProduct.id
    : rawProduct;
};

const sameCartConfiguration = (left, right) => {
  const addonsKey = (item) => (item.addons || [])
    .map((addon) => [String(addon.addonId), Number(addon.quantity)])
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId));
  return String(left.product) === String(right.product) &&
    String(left.variantId || '') === String(right.variantId || '') &&
    JSON.stringify(addonsKey(left)) === JSON.stringify(addonsKey(right));
};

const addOrMergeItem = (items, incoming) => {
  const existing = items.find((item) => sameCartConfiguration(item, incoming));
  if (!existing) {
    items.push(incoming);
    return;
  }
  existing.quantity += incoming.quantity;
  existing.total = (existing.price + existing.addonTotal) * existing.quantity;
};

exports.getCart = async (req, res) => {
  try {
    const userId = getUserId(req);
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    return res.status(200).json({ success: true, data: cart || { user: userId, items: [] } });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { productId, quantity = 1, items } = req.body || {};
    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    if (Array.isArray(items)) {
      if (items.length === 0) {
        await Cart.deleteOne({ user: userId });
        return res.status(200).json({ success: true, message: 'Cart deleted' });
      }

      const normalizedItems = [];
      for (const item of items) {
        const incomingProductId = getProductId(item);
        if (!incomingProductId || !mongoose.Types.ObjectId.isValid(incomingProductId)) {
          throw createError(`Invalid product id: ${incomingProductId || ''}`);
        }
        const product = await Product.findById(incomingProductId);
        if (!product) throw createError(`Product not found: ${incomingProductId}`, 404);
        addOrMergeItem(normalizedItems, normalizeCartItem(product, item));
      }
      cart.items = normalizedItems;
    } else {
      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        throw createError('productId must be a valid Mongo ObjectId');
      }
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      addOrMergeItem(cart.items, normalizeCartItem(product, req.body, quantity));
    }

    await cart.save();
    await cart.populate('items.product');
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { itemId } = req.params;
    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'quantity must be a positive integer' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in cart' });

    item.quantity = quantity;
    item.total = (item.price + item.addonTotal) * quantity;
    await cart.save();
    await cart.populate('items.product');
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.removeProduct = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { itemId } = req.params;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    if (!cart.items.id(itemId)) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    cart.items.pull({ _id: itemId });
    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id, user: userId });
      return res.status(200).json({ success: true, message: 'Cart item removed; empty cart deleted' });
    }

    await cart.save();
    await cart.populate('items.product');
    return res.status(200).json({ success: true, data: cart });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = getUserId(req);
    await Cart.deleteOne({ user: userId });
    return res.status(200).json({ success: true, message: 'Cart deleted' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.cartSummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(200).json({ success: true, data: { itemCount: 0, total: 0 } });

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.items.reduce((sum, item) => sum + item.total, 0);
    return res.status(200).json({ success: true, data: { itemCount, total } });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};