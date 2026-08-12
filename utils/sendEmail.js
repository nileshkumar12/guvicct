const nodemailer = require("nodemailer");
const {
  EMAIL_USER,
  EMAIL_PASS,
} = require("./config");

// =====================================================
// Gmail SMTP Transporter
// =====================================================

const getTransporter = () => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS must be configured in .env"
    );
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    family: 4, // ⭐ Force IPv4
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

// =====================================================
// Order Confirmation Email
// =====================================================

const sendOrderConfirmationEmail = async (order) => {
  try {
    if (!order) {
      throw new Error("Order data is missing");
    }

    const email = order.user?.email;

    if (!email) {
      throw new Error("Recipient email is missing");
    }

    if (!Array.isArray(order.items)) {
      throw new Error("Order items are missing");
    }

    console.log("📧 Sending order email to:", email);
    console.log("📦 Order:", order.orderNumber);

    const itemsHtml = order.items
      .map((item) => {
        const productName =
          item.productName ||
          item.product?.name ||
          "Product";

        const quantity = Number(item.quantity || 0);

        const price = Number(item.price || 0);

        const total = Number(
          item.total || price * quantity
        );

        return `
          <tr>
            <td style="
              padding:12px;
              border-bottom:1px solid #ddd;
            ">
              ${productName}
            </td>

            <td style="
              padding:12px;
              border-bottom:1px solid #ddd;
              text-align:center;
            ">
              ${quantity}
            </td>

            <td style="
              padding:12px;
              border-bottom:1px solid #ddd;
              text-align:right;
            ">
              ₹${total.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

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

    const mailOptions = {
      from: `"Your Store" <${EMAIL_USER}>`,

      to: email,

      subject: `Order Confirmed - ${
        order.orderNumber || "Your Order"
      }`,

      html: `
<!DOCTYPE html>

<html>

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

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

    <!-- HEADER -->

    <div
      style="
        background:#16a34a;
        padding:25px;
        text-align:center;
      "
    >

      <h1
        style="
          margin:0;
          color:#ffffff;
          font-size:26px;
        "
      >
        Order Confirmed 🎉
      </h1>

    </div>


    <!-- CONTENT -->

    <div style="padding:25px;">

      <p style="font-size:16px;">
        Hello ${customerName},
      </p>

      <p
        style="
          color:#374151;
          line-height:1.6;
        "
      >
        Thank you for your order.
        Your order has been successfully placed.
      </p>


      <!-- ORDER SUMMARY -->

      <div
        style="
          background:#f9fafb;
          border:1px solid #e5e7eb;
          border-radius:8px;
          padding:18px;
          margin:20px 0;
        "
      >

        <p style="margin:0 0 8px;">
          <strong>Order Number:</strong>
          ${order.orderNumber || "-"}
        </p>

        <p style="margin:0;">
          <strong>Total Amount:</strong>
          ₹${Number(order.total || 0).toFixed(2)}
        </p>

      </div>


      <!-- ORDER ITEMS -->

      <h3>Order Details</h3>

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


      <!-- SHIPPING ADDRESS -->

      <h3 style="margin-top:30px;">
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

        <strong>${customerName}</strong>

        ${
          line1
            ? `<br>${line1}`
            : ""
        }

        ${
          line2
            ? `<br>${line2}`
            : ""
        }

        ${
          city
            ? `<br>${city}`
            : ""
        }

        ${
          state
            ? `, ${state}`
            : ""
        }

        ${
          postalCode
            ? `<br>${postalCode}`
            : ""
        }

        ${
          country
            ? `<br>${country}`
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
        "
      >
        Thank you for shopping with us!
      </p>

    </div>


    <!-- FOOTER -->

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
          color:#777;
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

    const transporter = getTransporter();

    const info =
      await transporter.sendMail(mailOptions);

    console.log("✅ Order confirmation email sent");
    console.log("📧 To:", email);
    console.log("📦 Order:", order.orderNumber);
    console.log("🆔 Message ID:", info.messageId);

    return info;

  } catch (error) {

    console.error(
      "❌ Order confirmation email failed:"
    );

    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Response:", error.response);

    throw error;
  }
};


// =====================================================
// Shipment Update Email
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
        `"Your Store" <${EMAIL_USER}>`,

      to: email,

      subject:
        `Shipment Update - Order ${orderNumber}`,

      html: `
<!DOCTYPE html>

<html>

<head>
  <meta charset="UTF-8">
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
      margin:auto;
      background:#ffffff;
      padding:25px;
      border-radius:10px;
    "
  >

    <h2 style="color:#2563eb;">
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
        line-height:1.8;
      "
    >

      <strong>Status:</strong>
      ${status || "-"}
      <br>

      ${
        carrier
          ? `
            <strong>Carrier:</strong>
            ${carrier}
            <br>
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
      "✅ Shipment update email sent:",
      info.messageId
    );

    return info;

  } catch (error) {

    console.error(
      "❌ Shipment update email failed:",
      error.message
    );

    throw error;
  }
};


module.exports = {
  sendOrderConfirmationEmail,
  sendShipmentUpdateEmail,
};
