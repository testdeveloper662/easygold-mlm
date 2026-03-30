const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const EASY_GOLD_CUSTOMER_SUPPORT_EMAIL = process.env.EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

const MAIL_HOST = process.env.MAIL_HOST;
const GOLDFLEX_MAIL_HOST = process.env.GOLDFLEX_MAIL_HOST;

const GOLD_FLEX_SUPPORT_MAIL_SENDER = process.env.GOLD_FLEX_SUPPORT_MAIL_SENDER;
const GOLD_FLEX_SUPPORT_MAIL_PASSWORD = process.env.GOLD_FLEX_SUPPORT_MAIL_PASSWORD;
const GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS = process.env.GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS;
const GOLD_FLEX_SUPPORT_MAIL_FROM_NAME = process.env.GOLD_FLEX_SUPPORT_MAIL_FROM_NAME;

const PRIME_INVEST_SUPPORT_MAIL_SENDER = process.env.PRIME_INVEST_SUPPORT_MAIL_SENDER;
const PRIME_INVEST_SUPPORT_MAIL_PASSWORD = process.env.PRIME_INVEST_SUPPORT_MAIL_PASSWORD;
const PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS = process.env.PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS;
const PRIME_INVEST_SUPPORT_MAIL_FROM_NAME = process.env.PRIME_INVEST_SUPPORT_MAIL_FROM_NAME;

const EASY_GOLD_SUPPORT_MAIL_SENDER = process.env.EASY_GOLD_SUPPORT_MAIL_SENDER;
const EASY_GOLD_SUPPORT_MAIL_PASSWORD = process.env.EASY_GOLD_SUPPORT_MAIL_PASSWORD;
const EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS = process.env.EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS;
const EASY_GOLD_SUPPORT_MAIL_FROM_NAME = process.env.EASY_GOLD_SUPPORT_MAIL_FROM_NAME;

const formatWebsiteUrl = (url) => {
    if (!url) return "#";
    return url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;
};

const UpdateReferralLogStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            status, // APPROVED / REJECTED
            type,   // COMMISSION_APPROVED / COMMISSION_REJECTED
            tracking_number,
            tracking_link,
            remark,
        } = req.body;

        // 🔍 Find log
        const log = await db.TargetCustomerReferralLogs.findOne({
            where: { id },
            include: [
                {
                    model: db.TargetCustomers,
                    as: "fromCustomer",
                    attributes: ["id", "customer_name", "customer_email"],
                }
            ],
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Referral log not found",
            });
        }

        const previousStatus = log.status;

        // ✅ Validate status
        const validStatus = ["APPROVED", "REJECTED"];
        if (!validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        // ✅ Validate type
        const validTypes = [
            "COMMISSION_APPROVED",
            "COMMISSION_REJECTED",
        ];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid type",
            });
        }

        // 🧠 Extra validation
        if (status === "APPROVED" && (!tracking_number || !tracking_link)) {
            return res.status(400).json({
                success: false,
                message: "Tracking number and link are required for approval",
            });
        }

        // ✅ Update log
        await log.update({
            status,
            type,
            tracking_number: tracking_number || null,
            tracking_link: tracking_link || null,
            remark: remark || null,
            approved_at: status === "APPROVED" ? new Date() : null,
        });

        let address = "";

        let mailConfig = {};
        let finalFrom;

        const senderEmailConfig = {
            easygold: {
                user: EASY_GOLD_SUPPORT_MAIL_SENDER,
                pass: EASY_GOLD_SUPPORT_MAIL_PASSWORD,
            },
            goldflex: {
                user: GOLD_FLEX_SUPPORT_MAIL_SENDER,
                pass: GOLD_FLEX_SUPPORT_MAIL_PASSWORD,
            },
            primeinvest: {
                user: PRIME_INVEST_SUPPORT_MAIL_SENDER,
                pass: PRIME_INVEST_SUPPORT_MAIL_PASSWORD,
            }
        };

        let host = MAIL_HOST;

        if (log.product == "easygold Token") {
            host = MAIL_HOST;
            finalFrom = `"${EASY_GOLD_SUPPORT_MAIL_FROM_NAME}" <${EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS}>`;
            mailConfig = senderEmailConfig.easygold;

            address = "HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.easygold.io<br>support@easygold.io";
        } else if (log.product == "Primeinvest") {
            host = MAIL_HOST;
            finalFrom = `"${PRIME_INVEST_SUPPORT_MAIL_FROM_NAME}" <${PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS}>`;
            mailConfig = senderEmailConfig.primeinvest;

            address = "Hartmann & Benz Inc<br>8 The Green, Suite A<br>19901 Dover Kent County<br>United States of America (USA)<br>support@hbprimeinvest.com";
        } else if (log.product == "goldflex") {
            host = GOLDFLEX_MAIL_HOST;
            finalFrom = `"${GOLD_FLEX_SUPPORT_MAIL_FROM_NAME}" <${GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS}>`;
            mailConfig = senderEmailConfig.goldflex;

            address = "Service in NGR – U.S. headquarters.<br><br>HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.goldflex.io<br>support@goldflex.io";
        }

        let sending_link = `<a href="${formatWebsiteUrl(tracking_link)}" style="color: #0066cc; text-decoration: none; font-weight: bold;">link</a>`;

        const templateVariables = {
            amount: log.investment_amount || "",
            gram: `${log.commission_amount} grams` || "",
            tracking_number: tracking_number,
            tracking_link: sending_link,
            address: address
        };

        // const finalFrom = EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

        if (tracking_link !== null && tracking_number !== null) {
            try {
                let customerEmailData;
                customerEmailData = await getRenderedEmail(109, "en", templateVariables);

                const customerMailOptions = {
                    from: finalFrom,
                    to: log.fromCustomer?.customer_email,
                    subject: customerEmailData.subject,
                    html: customerEmailData.htmlContent,
                };

                await SendEmailHelper(customerMailOptions.subject, customerMailOptions.html, customerMailOptions.to, null, null, finalFrom, mailConfig, host);

            } catch (templateError) {
                console.error(templateError);
                throw new Error(
                    "Email template (ID: 109) not found. Please ensure it exists in 6lwup_email_view table."
                );
            }
        }

        return res.json({
            success: true,
            message:
                status === "APPROVED"
                    ? "Commission approved successfully"
                    : "Commission rejected successfully",
            data: log,
        });
    } catch (error) {
        console.error("UpdateReferralLogStatus error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = UpdateReferralLogStatus;