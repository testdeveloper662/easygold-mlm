require("dotenv").config();
const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: process.env.MAIL_SENDER,
//         pass: process.env.MAIL_PASSWORD,
//     },
// })


const SendEmailHelper = (subject, htmlContent, to, attachments = null, cc = null, from = null, smtpConfig = {}, host = null) => {
    try {
        return new Promise((resolve, reject) => {
            const transporter = nodemailer.createTransport({
                host: host || process.env.MAIL_HOST,
                port: Number(process.env.MAIL_PORT),
                secure: Number(process.env.MAIL_PORT) === 465, // true for port 465
                auth: {
                    user: smtpConfig?.user || process.env.MAIL_SENDER,
                    pass: smtpConfig?.pass || process.env.MAIL_PASSWORD,
                },
                tls: {
                    rejectUnauthorized: false, // optional, fixes some SSL issues
                },
            });

            const mailOptions = {
                from: from || process.env.MAIL_SENDER,
                to: to,
                subject: subject,
                html: htmlContent,
            };


            // Attach file only if path exists
            // normalize attachments to array
            if (attachments) {

                // if single string → convert to array
                const attachmentArray = Array.isArray(attachments)
                    ? attachments
                    : [attachments];

                mailOptions.attachments = attachmentArray.map(filePath => ({
                    filename: filePath.split("/").pop(),
                    path: filePath,
                }));
            }

            if (cc) {
                mailOptions.cc = cc;
            }

            console.log("Sending email with options:", mailOptions);

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