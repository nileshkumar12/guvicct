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
    hsnCode: {
        type: String,
        default: ""
    },
    gstRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    taxableAmount: {
        type: Number,
        default: 0
    },
    cgstAmount: {
        type: Number,
        default: 0
    },
    sgstAmount: {
        type: Number,
        default: 0
    },
    igstAmount: {
        type: Number,
        default: 0
    },
    gstAmount: {
        type: Number,
        default: 0
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

    taxableAmount: {
        type: Number,
        default: 0
    },

    cgstAmount: {
        type: Number,
        default: 0
    },

    sgstAmount: {
        type: Number,
        default: 0
    },

    igstAmount: {
        type: Number,
        default: 0
    },

    gstAmount: {
        type: Number,
        default: 0
    },

    grandTotal: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Invoice", invoiceSchema);