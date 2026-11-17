const defaultSuggestions = [
  "Show cheaper products",
  "Compare these products",
  "Show more options",
];

const formatChatbotResponse = ({
  sessionId,
  message,
  intent = "conversation",
  products = [],
  suggestions = defaultSuggestions,
}) => ({
  success: true,
  sessionId,
  message,
  reply: message,
  intent,
  products,
  suggestions,
});

module.exports = { formatChatbotResponse, defaultSuggestions };
