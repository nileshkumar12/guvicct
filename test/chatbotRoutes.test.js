const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../app");
const mongoose = require("mongoose");
const { resolveRecommendationFilters } = require("../controllers/chatbotController");
const { formatProduct } = require("../services/productSearchService");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/chatbot`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

const postJson = (path, body, headers = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

test("rejects empty chatbot messages before contacting OpenAI", async () => {
  const response = await postJson("/message", { message: " " });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("rejects invalid price ranges", async () => {
  const response = await postJson("/product-search", {
    minPrice: 100,
    maxPrice: 50,
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("validates conversation IDs before accessing MongoDB", async () => {
  const response = await fetch(`${baseUrl}/history?sessionId=invalid`);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("rejects an invalid optional JWT instead of downgrading to guest", async () => {
  const response = await postJson("/session", {}, {
    authorization: "Bearer not-a-jwt",
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});

test("requires authentication for order assistance", async () => {
  const response = await postJson("/order-status", {});
  assert.equal(response.status, 401);
  assert.equal((await response.json()).success, false);
});

test("falls back to live catalog keyword search when AI filter extraction fails", async () => {
  const result = await resolveRecommendationFilters({
    body: {},
    query: "blue jacket",
    requestId: "test-request",
    extractFilters: async () => {
      const error = new Error("OpenAI is not configured.");
      error.status = 503;
      error.code = "AI_NOT_CONFIGURED";
      throw error;
    },
  });

  assert.equal(result.fallbackUsed, true);
  assert.equal(result.filters.keyword, "blue jacket");
});

test("uses explicit recommendation filters without invoking AI", async () => {
  const result = await resolveRecommendationFilters({
    body: { category: "clothing" },
    query: "blue jacket",
    extractFilters: async () => {
      throw new Error("AI should not be called for structured filters.");
    },
  });

  assert.equal(result.fallbackUsed, false);
  assert.equal(result.filters.category, "clothing");
  assert.equal(result.filters.keyword, "blue jacket");
});

test("returns a meaningful 503 when recommendation catalog data is unavailable", async (t) => {
  if (mongoose.connection.readyState === 1) {
    t.skip("Requires an unconnected MongoDB instance.");
    return;
  }

  const response = await postJson("/recommendations", {});
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.code, "DATABASE_UNAVAILABLE");
  assert.match(body.message, /product catalog is temporarily unavailable/i);
});

test("uses in-stock variant prices for available product results", () => {
  const product = formatProduct(
    {
      _id: "product-id",
      name: "Sample product",
      price: 20,
      stock: 0,
      variants: [
        { _id: "variant-out", price: 30, stock: 0 },
        { _id: "variant-in", price: 90, stock: 2 },
      ],
    },
    50,
    100,
    true
  );
  assert.equal(product.price, 90);
  assert.equal(product.available, true);
});
