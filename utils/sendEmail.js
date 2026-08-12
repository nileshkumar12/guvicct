const nodemailer = require("nodemailer");

const getTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const sendOrderConfirmationEmail = async (order) => {
  if (!order.user?.email) throw new Error("Recipient email is missing");
  if (!Array.isArray(order.items)) throw new Error("Order items are missing");

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #ddd;">
            ${item.product?.name || "Product"}
          </td>
          <td style="padding:8px;border-bottom:1px solid #ddd;">
            ${item.quantity}
          </td>
          <td style="padding:8px;border-bottom:1px solid #ddd;">
            ₹${item.price}
          </td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"Your Store" <${process.env.EMAIL_USER}>`,
    to: order.user.email,
    subject: `Order Confirmed - ${order.orderNumber}`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;">

        <h2 style="color:#16a34a;">
          Order Confirmed 🎉
        </h2>

        <p>Hello ${order.shippingAddress?.name || "Customer"},</p>

        <p>
          Thank you for your order. Your order has been successfully placed.
        </p>

        <div style="
          background:#f5f5f5;
          padding:15px;
          border-radius:8px;
          margin:20px 0;
        ">
          <strong>Order Number:</strong> ${order.orderNumber}<br/>
          <strong>Total Amount:</strong> ₹${order.total}
        </div>

        <h3>Order Details</h3>

        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;">Product</th>
              <th style="text-align:left;padding:8px;">Qty</th>
              <th style="text-align:left;padding:8px;">Price</th>
            </tr>
          </thead>

          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <h3>Shipping Address</h3>

        <p>
          ${order.shippingAddress?.name || ""}<br/>
          ${order.shippingAddress?.line1 || ""}<br/>
          ${order.shippingAddress?.city || ""}, 
          ${order.shippingAddress?.state || ""}<br/>
          ${order.shippingAddress?.pincode || ""}
        </p>

        <p>
          We will notify you when your order is shipped.
        </p>

        <p>
          Thank you for shopping with us!
        </p>

      </div>
    `,
  };

  await getTransporter().sendMail(mailOptions);
};

const sendShipmentUpdateEmail = async ({ email, name, orderNumber, status, trackingNumber, carrier }) => {
  if (!email) throw new Error("Recipient email is missing");

  const mailOptions = {
    from: `"Your Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Shipment Update - Order ${orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;">
        <h2 style="color:#2563eb;">Shipment Update</h2>
        <p>Hello ${name || "Customer"},</p>
        <p>Your order <strong>${orderNumber}</strong> has been updated.</p>
        <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin:20px 0;">
          <strong>Status:</strong> ${status}<br/>
          ${carrier ? `<strong>Carrier:</strong> ${carrier}<br/>` : ""}
          ${trackingNumber ? `<strong>Tracking Number:</strong> ${trackingNumber}` : ""}
        </div>
        <p>Thank you for shopping with us!</p>
      </div>
    `,
  };

  await getTransporter().sendMail(mailOptions);
};

module.exports = {
  sendOrderConfirmationEmail,
  sendShipmentUpdateEmail,
};