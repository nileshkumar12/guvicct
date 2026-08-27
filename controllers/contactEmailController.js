const ContactEmail = require("../models/contactEmailModel");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);
exports.SendContactEmail = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            subject,
            message,
        } = req.body || {};

   
        if (
            !name?.trim() ||
            !email?.trim() ||
            !phone?.trim() ||
            !subject?.trim() ||
            !message?.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email, phone, subject and message are required.",
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
            subject: subject.trim(),
            message: message.trim(),
        });


        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: [process.env.CONTACT_RECEIVER],
            replyTo: email.trim(),

            subject: `New Contact Enquiry: ${subject.trim()}`,

            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>New Contact Enquiry</title>
                </head>

                <body style="
                    margin: 0;
                    padding: 30px;
                    background: #f5f5f5;
                    font-family: Arial, sans-serif;
                ">

                    <div style="
                        max-width: 650px;
                        margin: auto;
                        background: #ffffff;
                        border-radius: 10px;
                        overflow: hidden;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.08);
                    ">

                        <div style="
                            background: #111827;
                            color: #ffffff;
                            padding: 25px;
                        ">
                            <h2 style="margin: 0;">
                                New Contact Enquiry
                            </h2>

                            <p style="
                                margin: 8px 0 0;
                                color: #d1d5db;
                            ">
                                Someone submitted the contact form
                                on your website.
                            </p>
                        </div>

                        <div style="padding: 25px;">

                            <table style="
                                width: 100%;
                                border-collapse: collapse;
                            ">

                                <tr>
                                    <td style="
                                        padding: 10px 0;
                                        font-weight: bold;
                                        width: 120px;
                                    ">
                                        Name
                                    </td>

                                    <td style="padding: 10px 0;">
                                        ${name.trim()}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="
                                        padding: 10px 0;
                                        font-weight: bold;
                                    ">
                                        Email
                                    </td>

                                    <td style="padding: 10px 0;">
                                        ${email.trim()}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="
                                        padding: 10px 0;
                                        font-weight: bold;
                                    ">
                                        Phone
                                    </td>

                                    <td style="padding: 10px 0;">
                                        ${phone.trim()}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="
                                        padding: 10px 0;
                                        font-weight: bold;
                                    ">
                                        Subject
                                    </td>

                                    <td style="padding: 10px 0;">
                                        ${subject.trim()}
                                    </td>
                                </tr>

                            </table>

                            <hr style="
                                border: none;
                                border-top: 1px solid #e5e7eb;
                                margin: 20px 0;
                            " />

                            <h3>Message</h3>

                            <div style="
                                padding: 15px;
                                background: #f9fafb;
                                border-radius: 6px;
                                line-height: 1.6;
                            ">
                                ${message.trim()}
                            </div>

                            <p style="
                                margin-top: 25px;
                                font-size: 13px;
                                color: #6b7280;
                            ">
                                Reply directly to this email to respond
                                to ${name.trim()}.
                            </p>

                        </div>
                    </div>

                </body>
                </html>
            `,
        });

        if (error) {
            console.error("Resend Error:", error);

            return res.status(500).json({
                success: false,
                message:
                    "Contact information was saved, but email could not be sent.",
                contactId: contactEmail._id,
            });
        }

        return res.status(201).json({
            success: true,
            message: "Your message has been sent successfully.",
            contactId: contactEmail._id,
            emailId: data?.id,
        });

    } catch (error) {
        console.error("SendContactEmail Error:", error);

        return res.status(500).json({
            success: false,
            message:
                "Something went wrong while sending your message.",
        });
    }
};