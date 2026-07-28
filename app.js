
const express = require("express");
const userRouter = require("./routes/userRouter");
const invoiceRouter = require("./routes/invoiceRouter");
const authRouter = require("./routes/authRouter");
const productRouter = require("./routes/productRouter");
const categoryRouter = require("./routes/categoryRouter");
const sellerRouter = require("./routes/sellerRouter");
const cartRouter = require("./routes/cartRouter");
const wishlistRouter = require("./routes/wishlistRouter");
const orderRouter = require("./routes/orderRouter");
const cors = require("cors");
const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));


app.use(express.json());

const logger = require('./utils/logger');
// const errorRouter = require('./utils/errorRoute');

// middleware to log all the incoming requests
// app.use(morgan("dev"));
// app.use(logger);

// middleware to send response handling error routes
// app.use(errorRouter);

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/orders", orderRouter);
app.use("/users", userRouter);
app.use("/invoice", invoiceRouter);

module.exports =app;