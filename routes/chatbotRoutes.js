const crypto = require("crypto");
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { chatbotLimiter } = require("../middleware/chatbotRateLimit");
const { optionalAuth } = require("../middleware/optionalAuth");
const chatbotErrorMiddleware = require("../middleware/chatbotErrorMiddleware");
const controller = require("../controllers/chatbotController");

const router = express.Router();
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.use((req, res, next) => {
  req.id = crypto.randomUUID();
  console.info("Chatbot request:", { requestId: req.id, method: req.method, path: req.path });
  next();
});
router.use(chatbotLimiter);

router.post("/session", optionalAuth, asyncHandler(controller.createChatSession));
router.post("/message", optionalAuth, asyncHandler(controller.sendChatMessage));
router.get("/history", optionalAuth, asyncHandler(controller.getHistory));
router.get(
  "/conversations",
  authMiddleware.protect,
  asyncHandler(controller.getConversations)
);
router.delete(
  "/conversation/:id",
  optionalAuth,
  asyncHandler(controller.deleteConversation)
);
router.post("/product-search", optionalAuth, asyncHandler(controller.productSearch));
router.post("/recommendations", optionalAuth, asyncHandler(controller.recommendations));
router.post("/order-status", authMiddleware.protect, asyncHandler(controller.orderStatus));

router.use(chatbotErrorMiddleware);

module.exports = router;
