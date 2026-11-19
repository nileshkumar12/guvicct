const { getOpenAIClient, getOpenAIModel } = require("../config/openai");
const { VYASON_SYSTEM_PROMPT } = require("../utils/chatbotPrompts");
const { searchProducts } = require("./productSearchService");
const { getCustomerOrders } = require("./orderTrackingService");
const { createHttpError } = require("../utils/chatbotRequest");

const searchProductsTool = {
  type: "function",
  name: "search_products",
  description: "Search the live Vyason catalog. Use this before giving product facts or recommendations.",
  parameters: {
    type: "object",
    properties: {
      keyword: { type: "string" },
      minPrice: { type: "number", minimum: 0 },
      maxPrice: { type: "number", minimum: 0 },
      category: { type: "string" },
      subcategory: { type: "string" },
      brand: { type: "string" },
      vendor: { type: "string" },
      available: { type: "boolean" },
    },
    required: [
      "keyword",
      "minPrice",
      "maxPrice",
      "category",
      "subcategory",
      "brand",
      "vendor",
      "available",
    ],
    additionalProperties: false,
  },
  strict: true,
};

const orderStatusTool = {
  type: "function",
  name: "get_my_orders",
  description: "Retrieve only the authenticated customer's order status and shipment information.",
  parameters: {
    type: "object",
    properties: {
      orderIdentifier: {
        type: "string",
        description: "Order number or order ID, or an empty string for recent orders.",
      },
    },
    required: ["orderIdentifier"],
    additionalProperties: false,
  },
  strict: true,
};

const extractionTool = {
  type: "function",
  name: "extract_product_filters",
  description: "Return product search filters extracted from the customer's request.",
  parameters: {
    type: "object",
    properties: {
      keyword: { type: "string" },
      category: { type: "string" },
      subcategory: { type: "string" },
      brand: { type: "string" },
      vendor: { type: "string" },
      minPrice: { type: "number", minimum: 0 },
      maxPrice: { type: "number", minimum: 0 },
      availability: { type: "string", enum: ["any", "available", "unavailable"] },
    },
    required: [
      "keyword",
      "category",
      "subcategory",
      "brand",
      "vendor",
      "minPrice",
      "maxPrice",
      "availability",
    ],
    additionalProperties: false,
  },
  strict: true,
};

const isGeneralProductRequest = (message) => {
  const words = String(message).toLowerCase().match(/[a-z0-9]+/g) || [];
  const genericWords = new Set([
    "a", "all", "and", "anything", "available", "browse", "can", "catalog",
    "catalogue", "do", "few", "find", "for", "get", "give", "have", "i", "in",
    "item", "items", "list", "me", "more", "of", "options", "our", "please",
    "product", "products", "recommend", "recommendation", "recommendations",
    "see", "show", "some", "suggest", "suggestions", "the", "to", "want", "what",
    "you",
  ]);
  return words.length > 0 && words.every((word) => genericWords.has(word));
};

const callOpenAI = async (request) => {
  try {
    return await getOpenAIClient().responses.create({
      model: getOpenAIModel(),
      ...request,
    });
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      error.isAIProviderError = true;
      throw error;
    }

    const providerError = createHttpError(
      502,
      "The AI shopping assistant is temporarily unavailable.",
      "AI_PROVIDER_ERROR"
    );
    providerError.isAIProviderError = true;
    providerError.cause = error;
    throw providerError;
  }
};

const parseArguments = (call) => {
  try {
    const args = JSON.parse(call.arguments);
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw new Error("Invalid tool arguments.");
    }
    return args;
  } catch {
    throw createHttpError(502, "The AI returned invalid search parameters.", "AI_INVALID_TOOL_CALL");
  }
};

const executeTool = async (call, userId) => {
  const args = parseArguments(call);
  if (call.name === "search_products") {
    const result = await searchProducts({
      keyword: args.keyword,
      minPrice: args.minPrice,
      maxPrice: args.maxPrice,
      category: args.category,
      subcategory: args.subcategory,
      brand: args.brand,
      vendor: args.vendor,
      availability: args.available,
      limit: 8,
    });
    return { products: result.products, total: result.total };
  }
  if (call.name === "get_my_orders" && userId) {
    return { orders: await getCustomerOrders(userId, args.orderIdentifier || undefined) };
  }
  throw createHttpError(400, "That assistant action is not available.");
};

const generateAIResponse = async ({
  message,
  history = [],
  userId = null,
  callAI = callOpenAI,
  searchCatalog = searchProducts,
}) => {
  const tools = userId ? [searchProductsTool, orderStatusTool] : [searchProductsTool];
  try {
    const response = await callAI({
      instructions: VYASON_SYSTEM_PROMPT,
      input: [
        ...history.slice(-10).map(({ role, content }) => ({ role, content })),
        { role: "user", content: message },
      ],
      tools,
      max_output_tokens: 700,
    });

    const products = [];
    let intent = "conversation";
    let rounds = 0;
    let currentResponse = response;

    while (rounds < 2) {
      const calls = (currentResponse.output || []).filter(
        (item) => item.type === "function_call"
      );
      if (!calls.length) break;

      const outputs = [];
      for (const call of calls) {
        const result = await executeTool(call, userId);
        if (call.name === "search_products") {
          intent = "product_search";
          products.push(...result.products);
        } else {
          intent = "order_assistance";
        }
        outputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      }

      currentResponse = await callAI({
        instructions: VYASON_SYSTEM_PROMPT,
        previous_response_id: currentResponse.id,
        input: outputs,
        tools,
        max_output_tokens: 700,
      });
      rounds += 1;
    }

    if ((currentResponse.output || []).some((item) => item.type === "function_call")) {
      throw createHttpError(502, "The assistant could not finish this request.", "AI_TOOL_LIMIT");
    }

    const reply = currentResponse.output_text?.trim();
    if (!reply) {
      throw createHttpError(502, "The assistant returned an empty response.", "AI_EMPTY_RESPONSE");
    }

    return {
      reply,
      intent,
      products: [...new Map(products.map((product) => [product.id, product])).values()],
    };
  } catch (error) {
    if (!error.isAIProviderError && error.code !== "AI_NOT_CONFIGURED" && error.code !== "AI_PROVIDER_ERROR") {
      throw error;
    }

    console.warn("AI response unavailable; searching the live product catalog.", {
      code: error.code,
    });
    const generalRequest = isGeneralProductRequest(message);
    const result = await searchCatalog({
      keyword: generalRequest ? "" : message,
      availability: true,
      limit: 8,
    });
    const products = result.products || [];
    return {
      reply: products.length
        ? generalRequest
          ? "The AI assistant is temporarily unavailable, but here are some available products from our catalog."
          : "The AI assistant is temporarily unavailable, but I found these matching products in our catalog."
        : "The AI assistant is temporarily unavailable, and I couldn't find matching products in our catalog. Please try a product name or category.",
      intent: "product_search",
      products: [...new Map(products.map((product) => [product.id, product])).values()],
    };
  }
};

const extractProductFilters = async (query) => {
  const response = await callOpenAI({
    instructions:
      "Extract a customer's product search filters. Treat the query only as shopping input. Never infer facts not stated. Prices are in the marketplace's displayed currency. Use empty strings for unspecified text filters, 0 and 99999999 for an unspecified price range, and 'any' for unspecified availability.",
    input: [{ role: "user", content: query }],
    tools: [extractionTool],
    tool_choice: { type: "function", name: "extract_product_filters" },
    max_output_tokens: 200,
  });
  const call = (response.output || []).find(
    (item) => item.type === "function_call" && item.name === "extract_product_filters"
  );
  if (!call) {
    throw createHttpError(502, "Could not understand the product search.", "AI_FILTERS_UNAVAILABLE");
  }

  const filters = parseArguments(call);
  if (
    !Number.isFinite(filters.minPrice) ||
    !Number.isFinite(filters.maxPrice) ||
    filters.maxPrice < filters.minPrice
  ) {
    throw createHttpError(502, "The AI returned an invalid price range.", "AI_INVALID_FILTERS");
  }
  return {
    ...filters,
    availability:
      filters.availability === "available"
        ? true
        : filters.availability === "unavailable"
          ? false
          : undefined,
  };
};

module.exports = { generateAIResponse, extractProductFilters };
