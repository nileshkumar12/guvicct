const chatbotErrorMiddleware = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    console.error("Chatbot request failed:", {
      requestId: req.id,
      message: error.message,
      code: error.code,
    });
  }

  const message =
    error.code === "DATABASE_UNAVAILABLE"
      ? error.message
      : status >= 500
        ? "Unable to process your chatbot request. Please try again."
        : error.message;

  return res.status(status).json({
    success: false,
    message,
    ...(error.code ? { code: error.code } : {}),
  });
};

module.exports = chatbotErrorMiddleware;
