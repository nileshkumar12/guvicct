/**
 * Reusable GST calculation service.
 * Used by Order, Checkout/Payment and Invoice APIs so tax logic
 * (and its validation rules) live in exactly one place.
 *
 * Formulas:
 *   Taxable Amount = Price x Quantity  (base price, GST excluded)
 *   GST Amount      = Taxable Amount x GST Rate / 100
 *   Same state      -> CGST + SGST (split equally)
 *   Different state  -> IGST
 */

const round2 = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const isSameState = (stateA, stateB) => {
  if (!stateA || !stateB) return false;
  return String(stateA).trim().toLowerCase() === String(stateB).trim().toLowerCase();
};

const validateGstRate = (gstRate) => {
  const rate = Number(gstRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    const error = new Error("GST rate must be a valid number between 0 and 100");
    error.status = 400;
    throw error;
  }
  return rate;
};

const validateHsnCode = (hsnCode) => {
  if (hsnCode === undefined || hsnCode === null || hsnCode === "") return "";
  const code = String(hsnCode).trim();
  if (!/^\d{4,8}$/.test(code)) {
    const error = new Error("HSN code must be numeric and 4-8 digits long");
    error.status = 400;
    throw error;
  }
  return code;
};

const validatePrice = (price, label = "Price") => {
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) {
    const error = new Error(`${label} must be a valid non-negative number`);
    error.status = 400;
    throw error;
  }
  return value;
};

const validateQuantity = (quantity, label = "Quantity") => {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value <= 0) {
    const error = new Error(`${label} must be a valid positive integer`);
    error.status = 400;
    throw error;
  }
  return value;
};

/**
 * Calculates the GST breakup for a single order/invoice line item.
 */
const calculateItemGST = ({
  price,
  quantity,
  gstRate = 0,
  priceIncludesGST = false,
  sellerState = "",
  customerState = "",
}) => {
  const safePrice = validatePrice(price);
  const safeQuantity = validateQuantity(quantity);
  const safeGstRate = validateGstRate(gstRate);

  let taxableAmount;
  if (priceIncludesGST && safeGstRate > 0) {
    const basePrice = safePrice / (1 + safeGstRate / 100);
    taxableAmount = round2(basePrice * safeQuantity);
  } else {
    taxableAmount = round2(safePrice * safeQuantity);
  }

  const gstAmount = round2((taxableAmount * safeGstRate) / 100);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  const taxType = isSameState(sellerState, customerState) ? "CGST_SGST" : "IGST";

  if (taxType === "CGST_SGST") {
    cgstAmount = round2(gstAmount / 2);
    sgstAmount = round2(gstAmount - cgstAmount);
  } else {
    igstAmount = gstAmount;
  }

  if (taxableAmount < 0 || gstAmount < 0) {
    const error = new Error("GST calculation produced an invalid negative amount");
    error.status = 400;
    throw error;
  }

  return {
    taxableAmount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxType,
    totalAmount: round2(taxableAmount + gstAmount),
  };
};

/**
 * Aggregates per-item GST breakups into order/invoice level totals.
 * `items` must be the array of results returned by calculateItemGST.
 */
const calculateOrderTotals = ({ items = [], shippingCost = 0, discount = 0 }) => {
  const totals = items.reduce(
    (acc, item) => {
      acc.taxableAmount += Number(item.taxableAmount) || 0;
      acc.cgstAmount += Number(item.cgstAmount) || 0;
      acc.sgstAmount += Number(item.sgstAmount) || 0;
      acc.igstAmount += Number(item.igstAmount) || 0;
      acc.gstAmount += Number(item.gstAmount) || 0;
      return acc;
    },
    { taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, gstAmount: 0 }
  );

  const safeShippingCost = Math.max(0, Number(shippingCost) || 0);
  const requestedDiscount = Math.max(0, Number(discount) || 0);
  const safeDiscount = Math.min(requestedDiscount, totals.taxableAmount + totals.gstAmount);

  const grandTotal = round2(
    totals.taxableAmount + totals.gstAmount + safeShippingCost - safeDiscount
  );

  if (grandTotal < 0) {
    const error = new Error("Grand total cannot be negative");
    error.status = 400;
    throw error;
  }

  return {
    taxableAmount: round2(totals.taxableAmount),
    cgstAmount: round2(totals.cgstAmount),
    sgstAmount: round2(totals.sgstAmount),
    igstAmount: round2(totals.igstAmount),
    gstAmount: round2(totals.gstAmount),
    shippingCost: safeShippingCost,
    discount: safeDiscount,
    grandTotal,
  };
};

module.exports = {
  round2,
  isSameState,
  validateGstRate,
  validateHsnCode,
  validatePrice,
  validateQuantity,
  calculateItemGST,
  calculateOrderTotals,
};
