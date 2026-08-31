const express = require("express");
const userRouter = require("./routes/userRouter");
const invoiceRouter = require("./routes/invoiceRouter");
const authRouter = require("./routes/authRouter");
const productRouter = require("./routes/productRouter");
const categoryRouter = require("./routes/categoryRouter");
const brandRouter = require("./routes/brandRouter");
const sellerRouter = require("./routes/sellerRouter");
const cartRouter = require("./routes/cartRouter");
const wishlistRouter = require("./routes/wishlistRouter");
const orderRouter = require("./routes/orderRouter");
const adminRouter = require("./routes/adminRouter");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require('./routes/notificationRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const storeRoutes = require("./routes/storeRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const conntactEmailRoutes = require("./routes/sendcontactemailRouter");

const cors = require("cors");
const path = require("path");
const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "https://ecommerce-nilesh.netlify.app",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const logger = require('./utils/logger');

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/brands", brandRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/orders", orderRouter);
app.use("/api/admin", adminRouter);
app.use("/users", userRouter);
app.use("/invoice", invoiceRouter);
app.use("/api/payment", paymentRoutes);
app.use('/api/seller/notifications', notificationRoutes);
//app.use('/api/seller/shipments', shipmentRoutes);
app.use('/api/shipments', shipmentRoutes); 
app.use("/api/stores", storeRoutes);
app.use("/api", reviewRoutes);
app.use("/api/email/contactemail", conntactEmailRoutes);


module.exports =app;
