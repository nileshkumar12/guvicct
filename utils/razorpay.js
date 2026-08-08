const Razorpay = require("razorpay");
const {
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
} = require("./config");

let razorpayInstance = null;

const getRazorpay = () => {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return null;
    }

    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: RAZORPAY_KEY_ID,
            key_secret: RAZORPAY_KEY_SECRET,
        });
    }

    return razorpayInstance;
};

module.exports = getRazorpay;