const createHttpError = (status, message, code) => {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
};

const cleanText = (value, { min = 0, max = 120 } = {}) => {
  if (typeof value !== "string") {
    throw createHttpError(400, "Text values must be strings.");
  }
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (cleaned.length < min || cleaned.length > max) {
    throw createHttpError(400, `Text must be between ${min} and ${max} characters.`);
  }
  return cleaned;
};

const parseNumber = (value, field, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw createHttpError(400, `${field} must be a non-negative number.`);
  }
  return number;
};

const parsePagination = (query) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1) {
    throw createHttpError(400, "page must be a positive integer.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw createHttpError(400, "limit must be an integer between 1 and 50.");
  }
  return { page, limit };
};

module.exports = { createHttpError, cleanText, parseNumber, parsePagination };
