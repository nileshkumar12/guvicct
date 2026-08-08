const express = require("express");
const router = express.Router();
const {
    createOrder,
    verifyPayment,
} = require("../controllers/paymentController");

router.post("/create-order", createOrder);


// Verify Razorpay Payment
router.post("/verify-payment", verifyPayment);


module.exports = router;