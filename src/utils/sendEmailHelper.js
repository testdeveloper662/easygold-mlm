require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { sendViaGmailServiceAccount } = require("./gmailServiceAccountMailer");

// goldsilberstore.com system mails go via Gmail first (gmailServiceAccountMailer.js). SMTP is only
// a temporary fallback if Gmail fails, until goldsilberstore.com's SMTP is retired.
const buildSmtpTransporter = (smtpConfig, host) =>
    nodemailer.createTransport({
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

const SendEmailHelper = (subject, htmlContent, to, attachments = null, cc = null, from = null, smtpConfig = {}, host = null) => {
    try {
        return new Promise((resolve, reject) => {
            const mailOptions = {
                from: from || process.env.MAIL_SENDER,
                to: to,
                subject: subject,
                html: htmlContent,
            };

            // Attach file only if path exists and is valid
            if (attachments) {
                const attachmentArray = Array.isArray(attachments)
                    ? attachments
                    : [attachments];

                const validAttachments = [];

                for (const filePath of attachmentArray) {
                    if (!filePath) continue;

                    let resolvedPath = filePath;

                    if (typeof filePath === "string" && (filePath.startsWith("http://") || filePath.startsWith("https://"))) {
                        try {
                            const urlObj = new URL(filePath);
                            const localRelativePath = urlObj.pathname.startsWith("/") ? urlObj.pathname.substring(1) : urlObj.pathname;
                            const diskPath = path.join(process.cwd(), localRelativePath);

                            if (fs.existsSync(diskPath)) {
                                resolvedPath = diskPath;
                            } else {
                                console.warn(`[SendEmailHelper] Attachment file not found on disk (${diskPath}), skipping attachment to prevent 404 error.`);
                                continue;
                            }
                        } catch (e) {
                            console.warn(`[SendEmailHelper] Error parsing attachment URL ${filePath}:`, e.message);
                        }
                    } else if (typeof filePath === "string" && !fs.existsSync(filePath)) {
                        console.warn(`[SendEmailHelper] Local attachment file not found at ${filePath}, skipping.`);
                        continue;
                    }

                    validAttachments.push({
                        filename: typeof resolvedPath === "string" ? resolvedPath.split(/[\/\\]/).pop() : "attachment.pdf",
                        path: resolvedPath,
                    });
                }

                if (validAttachments.length > 0) {
                    mailOptions.attachments = validAttachments;
                }
            }

            if (cc) {
                mailOptions.cc = cc;
            }

            console.log("Sending email with options:", mailOptions);

            const sendViaSmtp = () =>
                buildSmtpTransporter(smtpConfig, host).sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error("Error sending email:", error);
                        return reject(error);
                    }
                    console.log("Email sent via SMTP:", info.response);
                    resolve(info);
                });

            // Brand mailers (Gold Flex, Prime Invest, Easy Gold) pass their own credentials and keep using their own SMTP.
            if (smtpConfig?.user) {
                return sendViaSmtp();
            }

            sendViaGmailServiceAccount(mailOptions)
                .then((info) => {
                    console.log("Email sent via Gmail:", info.id);
                    resolve(info);
                })
                .catch((gmailError) => {
                    console.error("Gmail send failed, falling back to SMTP:", gmailError.message);
                    sendViaSmtp();
                });
        });
    } catch (error) {
        console.log("error = ", error);
    }
};

module.exports = SendEmailHelper;