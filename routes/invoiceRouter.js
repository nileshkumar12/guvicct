const express = require("express");

const router = express.Router();

const { createInvoice, getInvoices, updateInvoice, deleteInvoice } = require("../controllers/invoiceController");

const auth = require("../middleware/auth");

router.post("/", auth, createInvoice);

router.get("/", auth, getInvoices);

router.put("/:id", auth, updateInvoice);

router.delete("/:id", auth, deleteInvoice);

module.exports = router;