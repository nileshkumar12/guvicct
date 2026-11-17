const rateLimit = require("express-rate-limit");

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many chatbot requests. Please try again shortly.",
  },
});

module.exports = { chatbotLimiter };
