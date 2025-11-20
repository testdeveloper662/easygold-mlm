require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASSWORD,
    },
});

const SendEmailHelper = (subject, htmlContent, to, attachmentPath = null, cc = null) => {
    try {
        return new Promise((resolve, reject) => {
            const mailOptions = {
                from: process.env.MAIL_SENDER,
                to: to,
                subject: subject,
                html: htmlContent,
            };


            // Attach file only if path exists
            if (attachmentPath) {
                mailOptions.attachments = [
                    {
                        filename: attachmentPath.split("/").pop(), // extract file name
                        path: attachmentPath,
                    }
                ];
            }
            if (cc) {
                mailOptions.cc = cc;
            }

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending email:", error);
                    return reject(error);
                }
                console.log("Email sent:", info.response);
                resolve(info);
            });
        });
    } catch (error) {
        console.log("error = ", error);
    }
}

module.exports = SendEmailHelper;