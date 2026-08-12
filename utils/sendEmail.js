const nodemailer = require("nodemailer");

// =====================================================
// Gmail SMTP Transporter
// =====================================================

const getTransporter = () => {
  if (!process.env.EMAIL_USER) {
    throw new Error("EMAIL_USER is not configured");
  }

  if (!process.env.EMAIL_PASS) {
    throw new Error("EMAIL_PASS is not configured");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// =====================================================
// Send Order Confirmation Email
// =====================================================

const sendOrderConfirmationEmail = async (order) => {
  try {
    console.log("========================================");
    console.log("📧 ORDER EMAIL START");
    console.log("========================================");

    if (!order) {
      throw new Error("Order data is missing");
    }

    // -----------------------------------------
    // Get customer email
    // -----------------------------------------

    const customerEmail =
      order.user?.email || order.customerEmail || null;

    if (!customerEmail) {
      throw new Error(
        "Recipient email is missing from order.user.email"
      );
    }

    console.log("📧 Recipient:", customerEmail);
    console.log("📦 Order:", order.orderNumber);

    // -----------------------------------------
    // Order items
    // -----------------------------------------

    if (!Array.isArray(order.items) || order.items.length === 0) {
      throw new Error("Order items are missing");
    }

    const itemsHtml = order.items
      .map((item) => {
        // Your schema stores productName directly
        const productName =
          item.productName ||
          item.product?.name ||
          "Product";

        const quantity = Number(item.quantity || 0);

        const price = Number(item.price || 0);

        const itemTotal = Number(
          item.total || price * quantity
        );

        return `
          <tr>
            <td
              style="
                padding:12px;
                border-bottom:1px solid #e5e7eb;
              "
            >
              ${productName}
            </td>

            <td
              style="
                padding:12px;
                border-bottom:1px solid #e5e7eb;
                text-align:center;
              "
            >
              ${quantity}
            </td>

            <td
              style="
                padding:12px;
                border-bottom:1px solid #e5e7eb;
                text-align:right;
              "
            >
              ₹${itemTotal.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

    // -----------------------------------------
    // Shipping address
    // -----------------------------------------

    const shippingAddress =
      order.shippingAddress || {};

    const customerName =
      shippingAddress.name ||
      order.user?.name ||
      "Customer";

    const line1 =
      shippingAddress.line1 || "";

    const line2 =
      shippingAddress.line2 || "";

    const city =
      shippingAddress.city || "";

    const state =
      shippingAddress.state || "";

    const postalCode =
      shippingAddress.postalCode ||
      shippingAddress.pincode ||
      "";

    const country =
      shippingAddress.country || "";

    // -----------------------------------------
    // Create email
    // -----------------------------------------

    const mailOptions = {
      from: `"Your Store" <${process.env.EMAIL_USER}>`,

      to: customerEmail,

      subject: `Order Confirmed - ${
        order.orderNumber || "Your Order"
      }`,

      html: `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Order Confirmation</title>
</head>

<body
  style="
    margin:0;
    padding:20px;
    background:#f3f4f6;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      max-width:650px;
      margin:0 auto;
      background:#ffffff;
      border-radius:10px;
      overflow:hidden;
    "
  >

    <!-- Header -->

    <div
      style="
        background:#16a34a;
        padding:25px;
        text-align:center;
      "
    >

      <h1
        style="
          color:#ffffff;
          margin:0;
          font-size:26px;
        "
      >
        Order Confirmed 🎉
      </h1>

    </div>


    <!-- Content -->

    <div style="padding:25px;">

      <p
        style="
          font-size:16px;
          color:#111827;
        "
      >
        Hello ${customerName},
      </p>


      <p
        style="
          font-size:15px;
          color:#374151;
          line-height:1.6;
        "
      >
        Thank you for your order.
        Your order has been successfully placed.
      </p>


      <!-- Order Summary -->

      <div
        style="
          background:#f9fafb;
          border:1px solid #e5e7eb;
          border-radius:8px;
          padding:18px;
          margin:20px 0;
        "
      >

        <p style="margin:0 0 8px 0;">
          <strong>Order Number:</strong>
          ${order.orderNumber || "-"}
        </p>

        <p style="margin:0;">
          <strong>Total Amount:</strong>
          ₹${Number(order.total || 0).toFixed(2)}
        </p>

      </div>


      <!-- Order Details -->

      <h3
        style="
          color:#111827;
          margin-top:30px;
        "
      >
        Order Details
      </h3>


      <table
        width="100%"
        cellspacing="0"
        cellpadding="0"
        style="
          border-collapse:collapse;
          font-size:14px;
        "
      >

        <thead>

          <tr
            style="
              background:#f3f4f6;
            "
          >

            <th
              style="
                padding:12px;
                text-align:left;
              "
            >
              Product
            </th>

            <th
              style="
                padding:12px;
                text-align:center;
              "
            >
              Qty
            </th>

            <th
              style="
                padding:12px;
                text-align:right;
              "
            >
              Amount
            </th>

          </tr>

        </thead>


        <tbody>

          ${itemsHtml}

        </tbody>

      </table>


      <!-- Shipping Address -->

      <h3
        style="
          color:#111827;
          margin-top:30px;
        "
      >
        Shipping Address
      </h3>


      <div
        style="
          background:#f9fafb;
          border:1px solid #e5e7eb;
          border-radius:8px;
          padding:15px;
          line-height:1.6;
          color:#374151;
        "
      >

        <strong>${customerName}</strong><br />

        ${line1}

        ${
          line2
            ? `<br />${line2}`
            : ""
        }

        ${
          city
            ? `<br />${city}`
            : ""
        }

        ${
          state
            ? `, ${state}`
            : ""
        }

        ${
          postalCode
            ? `<br />${postalCode}`
            : ""
        }

        ${
          country
            ? `<br />${country}`
            : ""
        }

      </div>


      <p
        style="
          margin-top:25px;
          color:#374151;
          line-height:1.6;
        "
      >
        We will notify you when your order is shipped.
      </p>


      <p
        style="
          color:#374151;
          line-height:1.6;
        "
      >
        Thank you for shopping with us!
      </p>

    </div>


    <!-- Footer -->

    <div
      style="
        background:#f9fafb;
        padding:15px;
        text-align:center;
      "
    >

      <p
        style="
          margin:0;
          font-size:12px;
          color:#6b7280;
        "
      >
        This is an automated email.
        Please do not reply to this email.
      </p>

    </div>

  </div>

</body>

</html>
      `,
    };

    // -----------------------------------------
    // Send email
    // -----------------------------------------

    const transporter = getTransporter();

    const info =
      await transporter.sendMail(mailOptions);

    console.log("========================================");
    console.log("✅ ORDER EMAIL SENT");
    console.log("📧 To:", customerEmail);
    console.log("📦 Order:", order.orderNumber);
    console.log("🆔 Message ID:", info.messageId);
    console.log("========================================");

    return info;

  } catch (error) {

    console.error("========================================");
    console.error("❌ ORDER EMAIL FAILED");
    console.error("========================================");

    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Response:", error.response);

    throw error;
  }
};


// =====================================================
// Send Shipment Update Email
// =====================================================

const sendShipmentUpdateEmail = async ({
  email,
  name,
  orderNumber,
  status,
  trackingNumber,
  carrier,
}) => {

  try {

    if (!email) {
      throw new Error(
        "Recipient email is missing"
      );
    }

    const transporter =
      getTransporter();

    const mailOptions = {

      from:
        `"Your Store" <${process.env.EMAIL_USER}>`,

      to: email,

      subject:
        `Shipment Update - Order ${orderNumber}`,

      html: `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Shipment Update</title>

</head>

<body
  style="
    margin:0;
    padding:20px;
    background:#f3f4f6;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      max-width:650px;
      margin:0 auto;
      background:#ffffff;
      padding:25px;
      border-radius:10px;
    "
  >

    <h2
      style="
        color:#2563eb;
        margin-top:0;
      "
    >
      Shipment Update 📦
    </h2>


    <p>
      Hello ${name || "Customer"},
    </p>


    <p>
      Your order
      <strong>${orderNumber || "-"}</strong>
      has been updated.
    </p>


    <div
      style="
        background:#f3f4f6;
        padding:18px;
        border-radius:8px;
        margin:20px 0;
        line-height:1.8;
      "
    >

      <strong>Status:</strong>
      ${status || "-"}
      <br />

      ${
        carrier
          ? `
            <strong>Carrier:</strong>
            ${carrier}
            <br />
          `
          : ""
      }

      ${
        trackingNumber
          ? `
            <strong>Tracking Number:</strong>
            ${trackingNumber}
          `
          : ""
      }

    </div>


    <p>
      Thank you for shopping with us!
    </p>


    <p
      style="
        font-size:12px;
        color:#777;
        margin-top:30px;
      "
    >
      This is an automated email.
      Please do not reply to this email.
    </p>

  </div>

</body>

</html>
      `,
    };

    const info =
      await transporter.sendMail(
        mailOptions
      );

    console.log(
      "✅ Shipment update email sent"
    );

    console.log(
      "Message ID:",
      info.messageId
    );

    return info;

  } catch (error) {

    console.error(
      "❌ Shipment update email failed:"
    );

    console.error(error);

    throw error;
  }
};


// =====================================================
// Export
// =====================================================

module.exports = {
  sendOrderConfirmationEmail,
  sendShipmentUpdateEmail,
};