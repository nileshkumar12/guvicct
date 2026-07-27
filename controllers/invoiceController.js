const Invoice = require("../models/invoiceModel");

exports.createInvoice = async (req, res) => {

    try {

        const {
            invoiceNo,
            customerName,
            customerAddress,
            date,
            status,
            items
        } = req.body;

        let grandTotal = 0;
        const itemsArray = Array.isArray(items) ? items : [];

        itemsArray.forEach(item => {
            item.total = item.qty * item.price;
            grandTotal += item.total;
        });

        const invoice = await Invoice.create({

            user: req.user.id,     // Logged-in user

            invoiceNo,

            customerName,

            customerAddress,

            date,

            status,

            items: itemsArray,

            grandTotal

        });

        res.status(201).json({

            success: true,

            data: invoice

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

}


exports.getInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ user: req.user.id });
        res.status(200).json({ success: true, count: invoices.length, data: invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateInvoice = async (req, res) => {
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

exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        res.status(200).json({ success: true, message: 'Invoice deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};