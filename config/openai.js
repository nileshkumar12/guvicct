const OpenAI = require("openai");

let client;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OpenAI is not configured.");
    error.status = 503;
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 20_000,
      maxRetries: 1,
    });
  }

  return client;
};

const getOpenAIModel = () =>
  process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

module.exports = { getOpenAIClient, getOpenAIModel };
