const { Resend } = require("resend");

// ============================================
// RESEND CONFIGURATION
// ============================================

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.error("❌ RESEND_API_KEY is not configured");
}

const resend = new Resend(resendApiKey);

// ============================================
// SEND ORDER CONFIRMATION EMAIL
// ============================================

const sendOrderConfirmationEmail = async (order) => {
  try {
    // ------------------------------------------
    // Validate order
    // ------------------------------------------

    if (!order) {
      throw new Error("Order data is missing");
    }

    const recipient = order.user?.email;

    if (!recipient) {
      throw new Error("Customer email is missing");
    }

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const orderNumber =
      order.orderNumber ||
      order.orderNo ||
      order._id?.toString() ||
      "N/A";

    console.log("📧 Sending order email to:", recipient);
    console.log("📦 Order:", orderNumber);

    // ------------------------------------------
    // Order values
    // ------------------------------------------

    const items = Array.isArray(order.items) ? order.items : [];

    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discount || 0);
    const shippingCost = Number(order.shippingCost || 0);
    const tax = Number(order.tax || 0);
    const total = Number(
      order.total ||
      subtotal - discount + shippingCost + tax
    );

    // ------------------------------------------
    // Shipping address
    // ------------------------------------------

    const address = order.shippingAddress || {};

    const shippingAddress = `
      ${address.line1 || ""}
      ${address.line2 ? `<br>${address.line2}` : ""}
      <br>
      ${address.city || ""}
      ${address.state || ""}
      - ${address.postalCode || ""}
      <br>
      ${address.country || ""}
    `;

    // ------------------------------------------
    // Product rows
    // ------------------------------------------

    const productRows = items
      .map((item) => {
        const productName =
          item.product?.name ||
          item.productName ||
          "Product";

        const quantity = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        const itemTotal = price * quantity;

        return `
          <tr>
            <td style="
              padding:12px;
              border-bottom:1px solid #eee;
              color:#333;
            ">
              ${productName}
            </td>

            <td style="
              padding:12px;
              border-bottom:1px solid #eee;
              text-align:center;
              color:#333;
            ">
              ${quantity}
            </td>

            <td style="
              padding:12px;
              border-bottom:1px solid #eee;
              text-align:right;
              color:#333;
            ">
              ₹${price.toFixed(2)}
            </td>

            <td style="
              padding:12px;
              border-bottom:1px solid #eee;
              text-align:right;
              color:#333;
              font-weight:600;
            ">
              ₹${itemTotal.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

    // ------------------------------------------
    // Payment method
    // ------------------------------------------

    const paymentMethod = order.paymentMethod || "N/A";

    // ------------------------------------------
    // Customer name
    // ------------------------------------------

    const customerName =
      order.user?.name ||
      order.user?.username ||
      "Customer";

    // ------------------------------------------
    // Email HTML
    // ------------------------------------------

    const html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Order Confirmation</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f5f5f5;
  font-family:Arial,Helvetica,sans-serif;
">

  <div style="
    width:100%;
    padding:30px 0;
  ">

    <div style="
      max-width:700px;
      margin:0 auto;
      background:#ffffff;
      border-radius:10px;
      overflow:hidden;
      box-shadow:0 2px 10px rgba(0,0,0,0.08);
    ">

      <!-- HEADER -->

      <div style="
        background:#111827;
        padding:25px;
        text-align:center;
      ">

        <h1 style="
          margin:0;
          color:#ffffff;
          font-size:26px;
        ">
          Order Confirmed
        </h1>

        <p style="
          margin:8px 0 0;
          color:#d1d5db;
          font-size:14px;
        ">
          Thank you for your purchase!
        </p>

      </div>

      <!-- CONTENT -->

      <div style="
        padding:30px;
      ">

        <h2 style="
          margin-top:0;
          color:#111827;
        ">
          Hi ${customerName},
        </h2>

        <p style="
          color:#555;
          font-size:15px;
          line-height:1.6;
        ">
          Your order has been successfully placed.
          We have received your order and will process it shortly.
        </p>

        <!-- ORDER NUMBER -->

        <div style="
          margin:25px 0;
          padding:18px;
          background:#f3f4f6;
          border-radius:8px;
        ">

          <p style="
            margin:0 0 5px;
            color:#6b7280;
            font-size:13px;
          ">
            Order Number
          </p>

          <strong style="
            color:#111827;
            font-size:18px;
          ">
            ${orderNumber}
          </strong>

        </div>

        <!-- ITEMS -->

        <h3 style="
          color:#111827;
          margin-bottom:12px;
        ">
          Order Details
        </h3>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            border-collapse:collapse;
            font-size:14px;
          "
        >

          <thead>

            <tr style="
              background:#f9fafb;
            ">

              <th style="
                padding:12px;
                text-align:left;
                color:#374151;
              ">
                Product
              </th>

              <th style="
                padding:12px;
                text-align:center;
                color:#374151;
              ">
                Qty
              </th>

              <th style="
                padding:12px;
                text-align:right;
                color:#374151;
              ">
                Price
              </th>

              <th style="
                padding:12px;
                text-align:right;
                color:#374151;
              ">
                Total
              </th>

            </tr>

          </thead>

          <tbody>

            ${productRows}

          </tbody>

        </table>

        <!-- SUMMARY -->

        <div style="
          margin-top:25px;
          border-top:1px solid #eee;
          padding-top:15px;
        ">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
          >

            <tr>

              <td style="
                padding:6px 0;
                color:#555;
              ">
                Subtotal
              </td>

              <td style="
                padding:6px 0;
                text-align:right;
              ">
                ₹${subtotal.toFixed(2)}
              </td>

            </tr>

            <tr>

              <td style="
                padding:6px 0;
                color:#555;
              ">
                Discount
              </td>

              <td style="
                padding:6px 0;
                text-align:right;
              ">
                - ₹${discount.toFixed(2)}
              </td>

            </tr>

            <tr>

              <td style="
                padding:6px 0;
                color:#555;
              ">
                Shipping
              </td>

              <td style="
                padding:6px 0;
                text-align:right;
              ">
                ₹${shippingCost.toFixed(2)}
              </td>

            </tr>

            <tr>

              <td style="
                padding:6px 0;
                color:#555;
              ">
                Tax
              </td>

              <td style="
                padding:6px 0;
                text-align:right;
              ">
                ₹${tax.toFixed(2)}
              </td>

            </tr>

            <tr>

              <td style="
                padding-top:15px;
                border-top:1px solid #ddd;
                font-size:18px;
                font-weight:bold;
                color:#111827;
              ">
                Total
              </td>

              <td style="
                padding-top:15px;
                border-top:1px solid #ddd;
                text-align:right;
                font-size:18px;
                font-weight:bold;
                color:#111827;
              ">
                ₹${total.toFixed(2)}
              </td>

            </tr>

          </table>

        </div>

        <!-- PAYMENT -->

        <div style="
          margin-top:25px;
          padding:18px;
          background:#f9fafb;
          border-radius:8px;
        ">

          <p style="
            margin:0;
            color:#555;
          ">
            <strong>Payment Method:</strong>
            ${paymentMethod}
          </p>

        </div>

        <!-- SHIPPING -->

        <div style="
          margin-top:25px;
        ">

          <h3 style="
            color:#111827;
            margin-bottom:8px;
          ">
            Shipping Address
          </h3>

          <p style="
            margin:0;
            color:#555;
            line-height:1.6;
          ">
            ${shippingAddress}
          </p>

        </div>

        <!-- FOOTER MESSAGE -->

        <p style="
          margin-top:30px;
          color:#555;
          line-height:1.6;
        ">
          Thank you for shopping with us.
          We will notify you when your order is shipped.
        </p>

      </div>

      <!-- FOOTER -->

      <div style="
        background:#f9fafb;
        padding:20px;
        text-align:center;
        color:#888;
        font-size:12px;
      ">

        <p style="margin:0;">
          This is an automated order confirmation email.
        </p>

      </div>

    </div>

  </div>

</body>
</html>
`;

    // ============================================
    // SEND THROUGH RESEND API
    // ============================================

    /*
      IMPORTANT:

      For initial testing, Resend provides
      onboarding@resend.dev.

      For production, verify your own domain
      in Resend and replace this address.
    */

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      "orders@nileshdesigner.co.in";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [recipient],
      subject: `Order Confirmation - ${orderNumber}`,
      html,
    });

    // ============================================
    // HANDLE RESEND ERROR
    // ============================================

    if (error) {
      console.error("❌ Resend API error:");
      console.error(error);

      throw new Error(
        error.message || "Resend email sending failed"
      );
    }

    // ============================================
    // SUCCESS
    // ============================================

    return data;

  } catch (error) {
    console.error("❌ Order confirmation email failed:");
    console.error("Message:", error.message);
    console.error("Code:", error.code || "N/A");

    throw error;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
};