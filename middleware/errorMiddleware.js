const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? error.status
      : error.type === "entity.too.large"
        ? 413
        : error instanceof SyntaxError && error.status === 400
          ? 400
          : 500;

  if (status >= 500) {
    console.error("Request failed:", {
      method: req.method,
      path: req.path,
      message: error.message,
    });
  }

  return res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "An unexpected error occurred."
        : status === 413
          ? "Request body is too large."
          : error.message,
  });
};

module.exports = errorMiddleware;
