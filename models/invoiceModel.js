const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    item: {
        type: String,
        required: true
    },
    description: String,
    qty: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    }
});

const invoiceSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    invoiceNo: {
        type: String,
        required: true,
        unique: true
    },

    customerName: {
        type: String,
        required: true
    },

    customerAddress: {
        type: String
    },

    date: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        enum: ["Pending", "Paid", "Cancelled"],
        default: "Pending"
    },

    items: [itemSchema],

    grandTotal: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Invoice", invoiceSchema);