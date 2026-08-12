const nodemailer = require("nodemailer");

// Create Gmail SMTP transporter
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
        secure: true, // SSL
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

// Send Order Confirmation Email
const sendOrderConfirmationEmail = async (order) => {
    try {
        if (!order) {
            throw new Error("Order data is missing");
        }

        if (!order.user?.email) {
            throw new Error("Recipient email is missing");
        }

        if (!Array.isArray(order.items)) {
            throw new Error("Order items are missing");
        }

        const itemsHtml = order.items
            .map(
                (item) => `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #ddd;">
              ${item.product?.name || "Product"}
            </td>

            <td style="padding:10px;border-bottom:1px solid #ddd;">
              ${item.quantity || 0}
            </td>

            <td style="padding:10px;border-bottom:1px solid #ddd;">
              ₹${Number(item.price || 0).toFixed(2)}
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
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Order Confirmation</title>
          </head>

          <body style="margin:0;padding:20px;background:#f8f8f8;">
            <div
              style="
                font-family:Arial,sans-serif;
                max-width:650px;
                margin:auto;
                background:#ffffff;
                padding:25px;
                border-radius:10px;
              "
            >

              <h2 style="color:#16a34a;margin-top:0;">
                Order Confirmed 🎉
              </h2>

              <p>
                Hello ${order.shippingAddress?.name || "Customer"},
              </p>

              <p>
                Thank you for your order.
                Your order has been successfully placed.
              </p>

              <div
                style="
                  background:#f5f5f5;
                  padding:15px;
                  border-radius:8px;
                  margin:20px 0;
                "
              >
                <strong>Order Number:</strong>
                ${order.orderNumber || "-"}
                <br />

                <strong>Total Amount:</strong>
                ₹${Number(order.total || 0).toFixed(2)}
              </div>

              <h3>Order Details</h3>

              <table
                style="
                  width:100%;
                  border-collapse:collapse;
                  margin-bottom:25px;
                "
              >
                <thead>
                  <tr>
                    <th style="text-align:left;padding:10px;">
                      Product
                    </th>

                    <th style="text-align:left;padding:10px;">
                      Qty
                    </th>

                    <th style="text-align:left;padding:10px;">
                      Price
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <h3>Shipping Address</h3>

              <p>
                ${order.shippingAddress?.name || ""}<br />

                ${order.shippingAddress?.line1 || ""}<br />

                ${order.shippingAddress?.city || ""}
                ${order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""}
                <br />

                ${order.shippingAddress?.pincode || ""}
                ${order.shippingAddress?.country
                    ? `<br />${order.shippingAddress.country}`
                    : ""
                }
              </p>

              <p>
                We will notify you when your order is shipped.
              </p>

              <p>
                Thank you for shopping with us!
              </p>

              <hr style="border:none;border-top:1px solid #ddd;margin:25px 0;" />

              <p style="font-size:12px;color:#777;">
                This is an automated email. Please do not reply to this email.
              </p>

            </div>
          </body>
        </html>
      `,
        };

        const transporter = getTransporter();

        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Order confirmation email sent");
        console.log("Message ID:", info.messageId);

        return info;
    } catch (error) {
        console.error("❌ Order confirmation email failed:");
        console.error(error);

        throw error;
    }
};

// Send Shipment Update Email
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
            throw new Error("Recipient email is missing");
        }

        const mailOptions = {
            from: `"Your Store" <${process.env.EMAIL_USER}>`,

            to: email,

            subject: `Shipment Update - Order ${orderNumber}`,

            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Shipment Update</title>
          </head>

          <body style="margin:0;padding:20px;background:#f8f8f8;">

            <div
              style="
                font-family:Arial,sans-serif;
                max-width:650px;
                margin:auto;
                background:#ffffff;
                padding:25px;
                border-radius:10px;
              "
            >

              <h2 style="color:#2563eb;margin-top:0;">
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
                  background:#f5f5f5;
                  padding:15px;
                  border-radius:8px;
                  margin:20px 0;
                "
              >

                <strong>Status:</strong>
                ${status || "-"}
                <br />

                ${carrier
                    ? `
                      <strong>Carrier:</strong>
                      ${carrier}
                      <br />
                    `
                    : ""
                }

                ${trackingNumber
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

              <hr style="border:none;border-top:1px solid #ddd;margin:25px 0;" />

              <p style="font-size:12px;color:#777;">
                This is an automated email. Please do not reply to this email.
              </p>

            </div>

          </body>
        </html>
      `,
        };

        const transporter = getTransporter();

        const info = await getTransporter().sendMail(mailOptions);

console.log("✅ Email sent successfully");
console.log("Message ID:", info.messageId);

return info;

    } catch (error) {
        console.error("❌ Shipment update email failed:");
        console.error(error);

        throw error;
    }
};

module.exports = {
    sendOrderConfirmationEmail,
    sendShipmentUpdateEmail,
};



const testEmail = async () => {
  try {
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log(
      "EMAIL_PASS:",
      process.env.EMAIL_PASS
        ? "LOADED"
        : "MISSING"
    );

    const transporter = getTransporter();

    await transporter.verify();

    console.log("✅ Gmail SMTP connection successful");

    const info = await transporter.sendMail({
      from: `"Your Store" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Gmail SMTP Test",
      html: `
        <h2>SMTP Test Successful</h2>
        <p>Your Gmail SMTP configuration is working.</p>
      `,
    });

    console.log("✅ Test email sent:", info.messageId);
  } catch (error) {
    console.error("❌ SMTP TEST FAILED");
    console.error(error);
  }
};

testEmail();