const Invoice = require("../models/invoiceModel");
const { calculateItemGST, calculateOrderTotals } = require("../utils/gstCalculator");

const createInvoice = async (req, res) => {

    try {

        const {
            invoiceNo,
            customerName,
            customerAddress,
            date,
            status,
            items,
            sellerState,
            customerState,
        } = req.body;

        const itemsArray = Array.isArray(items) ? items : [];

        const gstBreakups = [];
        const processedItems = itemsArray.map((item) => {
            const gst = calculateItemGST({
                price: item.price,
                quantity: item.qty,
                gstRate: item.gstRate || 0,
                priceIncludesGST: !!item.priceIncludesGST,
                sellerState: sellerState || "",
                customerState: customerState || "",
            });
            gstBreakups.push(gst);
            return {
                ...item,
                hsnCode: item.hsnCode || "",
                gstRate: item.gstRate || 0,
                taxableAmount: gst.taxableAmount,
                cgstAmount: gst.cgstAmount,
                sgstAmount: gst.sgstAmount,
                igstAmount: gst.igstAmount,
                gstAmount: gst.gstAmount,
                total: gst.totalAmount,
            };
        });

        const totals = calculateOrderTotals({ items: gstBreakups });

        const invoice = await Invoice.create({

            user: req.user.id,     // Logged-in user

            invoiceNo,

            customerName,

            customerAddress,

            date,

            status,

            items: processedItems,

            taxableAmount: totals.taxableAmount,
            cgstAmount: totals.cgstAmount,
            sgstAmount: totals.sgstAmount,
            igstAmount: totals.igstAmount,
            gstAmount: totals.gstAmount,
            grandTotal: totals.grandTotal

        });

        res.status(201).json({

            success: true,

            data: invoice

        });

    } catch (error) {

        res.status(error.status || 500).json({

            success: false,

            message: error.message

        });

    }

}


const getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ user: req.user.id });
        res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            req.body,
            { new: true }
        );

        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        res.status(200).json({ success: true, message: 'Invoice deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


module.exports={ createInvoice, getInvoices, updateInvoice, deleteInvoice };