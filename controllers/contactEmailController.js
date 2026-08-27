const ContactEmail = require("../models/contactEmailModel");

exports.SendContactEmail = async (req, res) => {
    try {
        const { name, email, phone, subject, message,} = req.body || {};

        if (!name?.trim() || !email?.trim() ||  !phone?.trim() || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name, email, phone and message are required.",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        const contactEmail = await ContactEmail.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            subject: subject?.trim() || "",
            message: message.trim(),
        });

        return res.status(201).json({
            success: true,
            message: "Your message has been sent successfully.",
            data: contactEmail,
        });

    } catch (error) {
        console.error("SendContactEmail Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while sending your message.",
            error: error.message,
        });
    }
};