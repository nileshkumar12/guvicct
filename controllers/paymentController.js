const crypto = require("crypto");
const getRazorpay = require("../utils/razorpay");
const { RAZORPAY_KEY_ID,  RAZORPAY_KEY_SECRET,} = require("../utils/config");
const Order = require("../models/orderModel");
const createRazorpayOrder = async (req, res) => {
    try {
        const {orderId} = req.body;
        const razorpay = getRazorpay();
        if (!razorpay) {
            return res.status(500).json({
                success: false,
                message: "Razorpay credentials are not configured",
            });
        }
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (req.user && order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to pay for this order",
            });
        }
        if (order.paymentStatus === "Paid") {
            return res.status(400).json({
                success: false,
                message: "Order is already paid",
            });
        }

        const amountInPaise = Math.round(Number(order.total) * 100);
        if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
            return res.status(400).json({
                success: false,
                message: "Order amount is invalid",
            });
        }
        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: order.orderNumber,
            notes: {
                orderId: order._id.toString(),
                orderNumber: order.orderNumber,
            },
        });
        order.razorpayOrderId = razorpayOrder.id;
        order.paymentMethod = "razorpay";
        await order.save();
        return res.status(200).json({
            success: true,
            message: "Razorpay order created successfully",
            order: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            },
            keyId: RAZORPAY_KEY_ID,
            orderId: order._id,
            orderNumber: order.orderNumber,
        });
    } catch (error) {
        console.error("Create Razorpay Order Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order",
            error: error.message,
        });
    }
};

const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            orderId,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
        } = req.body;
        if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment details are incomplete",
            });
        }
        if (!RAZORPAY_KEY_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Razorpay credentials are not configured",
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to verify this payment",
            });
        }

        if (order.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: "Razorpay order mismatch",
            });
        }
   
        const body = order.razorpayOrderId + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(body).digest("hex");
     
        const isValid = expectedSignature.length === razorpay_signature.length && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));
        if (!isValid) {
            order.paymentStatus = "Failed";
            await order.save();
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }

        order.paymentStatus = "Paid";
        order.status = "Confirmed";
        order.paymentMethod = "razorpay";
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;
        await order.save();
        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                paymentStatus: order.paymentStatus,
                status: order.status,
                razorpayPaymentId: order.razorpayPaymentId,
            },
        });
    } catch (error) {
        console.error("Verify Razorpay Payment Error:", error);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error: error.message,
        });
    }
};
module.exports = {
    createRazorpayOrder,
    verifyRazorpayPayment,
};