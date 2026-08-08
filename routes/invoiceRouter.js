const express = require("express");

const router = express.Router();

const {
    createInvoice,
    getInvoices,
    updateInvoice,
    deleteInvoice
} = require("../controllers/invoiceController");

const authMiddleware = require("../middleware/authMiddleware");

// Create invoice
router.post("/", authMiddleware, createInvoice);

// Get invoices
router.get("/", authMiddleware, getInvoices);

// Update invoice
router.put("/:id", authMiddleware, updateInvoice);

// Delete invoice
router.delete("/:id", authMiddleware, deleteInvoice);

module.exports = router;