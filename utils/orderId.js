const crypto = require("crypto");

const pad2 = (value) =>
  String(value).padStart(2, "0");

const getDatePart = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());

  return `${year}${month}${day}`;
};

const getRandomPart = () => {
  return crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase();
};

const generateOrderNumber = (date = new Date()) => {
  return `ORD-${getDatePart(date)}-${getRandomPart()}`;
};

module.exports = {
  generateOrderNumber,
};