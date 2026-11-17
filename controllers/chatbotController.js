const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const ChatConversation = require("../models/ChatConversation");
const { generateAIResponse, extractProductFilters } = require("../services/aiService");
const { searchProducts } = require("../services/productSearchService");
const { getRecommendations } = require("../services/recommendationService");
const { getCustomerOrders } = require("../services/orderTrackingService");
const { formatChatbotResponse, defaultSuggestions } = require("../utils/chatbotResponseFormatter");
const {
  cleanText,
  createHttpError,
  parseNumber,
  parsePagination,
} = require("../utils/chatbotRequest");

const getUserId = (req) => req.user?._id || req.user?.id || null;

const optionalText = (input, field, options) => {
  const value = input[field];
  if (value === undefined || value === null || value === "") return "";
  return cleanText(value, options);
};

const validateSessionId = (sessionId) => {
  if (typeof sessionId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(sessionId)) {
    throw createHttpError(400, "A valid sessionId is required.");
  }
  return sessionId;
};

const getOwnedConversation = async (sessionId, userId) => {
  const conversation = await ChatConversation.findOne({ sessionId });
  if (!conversation) throw createHttpError(404, "Conversation not found.");
  if (String(conversation.user || "") !== String(userId || "")) {
    throw createHttpError(403, "Conversation access denied.");
  }
  return conversation;
};

const parseAvailability = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "available") return true;
  if (value === false || value === "false" || value === "unavailable") return false;
  throw createHttpError(400, "availability must be true, false, available, or unavailable.");
};

const normalizeFilters = (input) => {
  const minPrice = parseNumber(input.minPrice, "minPrice", 0);
  const maxPrice = parseNumber(input.maxPrice, "maxPrice", 99999999);
  if (maxPrice < minPrice) {
    throw createHttpError(400, "maxPrice must be greater than or equal to minPrice.");
  }
  return {
    keyword: optionalText(input, "keyword", { max: 120 }),
    category: optionalText(input, "category", { max: 80 }),
    subcategory: optionalText(input, "subcategory", { max: 80 }),
    brand: optionalText(input, "brand", { max: 80 }),
    vendor: optionalText(input, "vendor", { max: 100 }),
    minPrice,
    maxPrice,
    availability: parseAvailability(input.availability),
  };
};

const createChatSession = async (req, res) => {
  const sessionId = randomUUID();
  return res.status(201).json({ success: true, sessionId });
};

const sendChatMessage = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "A JSON request body is required.");
  }

  const message = cleanText(body.message, { min: 1, max: 1000 });
  const sessionId = body.sessionId ? validateSessionId(body.sessionId) : randomUUID();
  const userId = getUserId(req);
  let conversation = await ChatConversation.findOne({ sessionId });

  if (conversation) {
    if (String(conversation.user || "") !== String(userId || "")) {
      throw createHttpError(403, "Chat session access denied.");
    }
  } else {
    conversation = new ChatConversation({ sessionId, user: userId, messages: [] });
  }

  const aiResult = await generateAIResponse({
    message,
    history: conversation.messages.slice(-10),
    userId,
  });

  conversation.messages.push(
    { role: "user", content: message },
    { role: "assistant", content: aiResult.reply, intent: aiResult.intent }
  );
  conversation.messages = conversation.messages.slice(-40);
  conversation.lastActivityAt = new Date();
  await conversation.save();

  return res.status(200).json({
    ...formatChatbotResponse({
      sessionId,
      message: aiResult.reply,
      intent: aiResult.intent,
      products: aiResult.products,
      suggestions: defaultSuggestions,
    }),
    conversationId: String(conversation._id),
  });
};

const getHistory = async (req, res) => {
  const sessionId = validateSessionId(req.query.sessionId);
  const conversation = await getOwnedConversation(sessionId, getUserId(req));
  const { page, limit } = parsePagination(req.query);
  const allMessages = conversation.messages;
  const end = Math.max(0, allMessages.length - (page - 1) * limit);
  const start = Math.max(0, end - limit);
  return res.json({
    success: true,
    sessionId,
    conversationId: String(conversation._id),
    messages: allMessages.slice(start, end),
    pagination: {
      page,
      limit,
      total: allMessages.length,
      totalPages: Math.ceil(allMessages.length / limit),
    },
  });
};

const getConversations = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw createHttpError(401, "Authentication required.");
  const { page, limit } = parsePagination(req.query);
  const filter = { user: userId };
  const [conversations, total] = await Promise.all([
    ChatConversation.find(filter)
      .select("sessionId messages lastActivityAt createdAt")
      .sort({ lastActivityAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ChatConversation.countDocuments(filter),
  ]);
  return res.json({
    success: true,
    conversations: conversations.map((conversation) => ({
      id: String(conversation._id),
      sessionId: conversation.sessionId,
      lastActivityAt: conversation.lastActivityAt,
      createdAt: conversation.createdAt,
      messageCount: conversation.messages.length,
      preview: conversation.messages.at(-1)?.content || "",
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

const deleteConversation = async (req, res) => {
  const userId = getUserId(req);
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw createHttpError(400, "Invalid conversation ID.");
  }
  const ownershipFilter = userId
    ? { user: userId }
    : { user: null, sessionId: validateSessionId(req.query.sessionId) };
  const result = await ChatConversation.deleteOne({
    _id: req.params.id,
    ...ownershipFilter,
  });
  if (!result.deletedCount) throw createHttpError(404, "Conversation not found.");
  return res.json({ success: true, message: "Conversation deleted." });
};

const productSearch = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "A JSON request body is required.");
  }
  const { page, limit } = parsePagination(body);
  const query = optionalText(body, "query", { max: 300 });
  const directFilters = normalizeFilters(body);
  const hasStructuredFilter = [
    "keyword",
    "category",
    "subcategory",
    "brand",
    "vendor",
    "minPrice",
    "maxPrice",
    "availability",
  ].some((key) => body[key] !== undefined && body[key] !== "");

  let filters = directFilters;
  if (query && !hasStructuredFilter) {
    filters = { ...directFilters, ...(await extractProductFilters(query)) };
  } else if (query && !filters.keyword) {
    filters.keyword = query;
  }

  const result = await searchProducts({ ...filters, page, limit });
  return res.json({
    success: true,
    intent: "product_search",
    filters,
    ...result,
    suggestions: defaultSuggestions,
  });
};

const recommendations = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "A JSON request body is required.");
  }
  const query = optionalText(body, "query", { max: 300 });
  const { filters, fallbackUsed } = await resolveRecommendationFilters({
    body,
    query,
    requestId: req.id,
  });
  const productId = optionalText(body, "productId", { min: 24, max: 24 });
  const limit = parseNumber(body.limit, "limit", 8);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw createHttpError(400, "limit must be an integer between 1 and 20.");
  }

  const products = await getRecommendations({
    ...filters,
    productId,
    limit,
  });
  const message = products.length
    ? fallbackUsed
      ? "AI-assisted matching is unavailable; these results match the live product catalog."
      : "Here are some products you may like!"
    : "I couldn't find matching products right now.";
  return res.json({
    success: true,
    intent: "recommendations",
    message,
    fallbackUsed,
    products,
    suggestions: defaultSuggestions,
  });
};

const resolveRecommendationFilters = async ({
  body,
  query,
  requestId,
  extractFilters = extractProductFilters,
}) => {
  const directFilters = normalizeFilters(body);
  if (!query) return { filters: directFilters, fallbackUsed: false };

  const hasStructuredFilter = [
    "keyword",
    "category",
    "subcategory",
    "brand",
    "vendor",
    "minPrice",
    "maxPrice",
    "availability",
  ].some((key) => body[key] !== undefined && body[key] !== "");
  if (hasStructuredFilter) {
    return {
      filters: {
        ...directFilters,
        keyword: directFilters.keyword || query,
      },
      fallbackUsed: false,
    };
  }

  try {
    return { filters: await extractFilters(query), fallbackUsed: false };
  } catch (error) {
    console.warn("Recommendation query interpretation failed; using catalog search.", {
      requestId,
      code: error.code,
    });
    return {
      filters: { ...directFilters, keyword: query },
      fallbackUsed: true,
    };
  }
};

const orderStatus = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) throw createHttpError(401, "Authentication required.");
  const orderIdentifier = optionalText(req.body || {}, "orderNumber", {
    min: 1,
    max: 80,
  }) || undefined;
  const orders = await getCustomerOrders(userId, orderIdentifier);
  if (orderIdentifier && !orders.length) {
    throw createHttpError(404, "Order not found.");
  }
  return res.json({ success: true, orders });
};

module.exports = {
  createChatSession,
  sendChatMessage,
  getHistory,
  getConversations,
  deleteConversation,
  productSearch,
  recommendations,
  resolveRecommendationFilters,
  orderStatus,
};
