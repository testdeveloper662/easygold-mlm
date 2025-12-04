require("dotenv").config();
const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const { companyAddressMap, generateImageUrl, payoutForType } = require("../../utils/Helper");
const { generatePDF } = require("../../utils/pdfGenerator");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const CreateBrokerPayoutRequest = async (req, res) => {
    try {
        const user = req?.user?.user;
        const broker_id = user?.broker_id;
        console.log("user=11111111111 ", broker_id);


        if (!broker_id) {
            return res.status(400).json({
                success: false,
                message: "broker_id is required.",
            });
        }
        let brokerDetails = await db.Brokers.findOne({
            where: { id: broker_id },
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "user_nicename", "user_login", "user_email"],
                    include: [
                        {
                            model: db.UsersMeta,
                            as: "user_meta",
                            attributes: ["meta_key", "meta_value"],
                            where: {
                                meta_key: ["language", "u_web_site", "u_phone", "u_company", "u_street", "u_postcode", "u_location", "u_account_owner", "u_bank", "u_iban", "u_bic"]
                            },
                            required: false
                        },
                    ]
                },
            ]
        });
        brokerDetails = brokerDetails?.get({ plain: true });
        if (!brokerDetails) {
            return res.status(404).json({
                success: false,
                message: "Broker not found.",
            });
        }
        console.log("brokerDetails= ", brokerDetails);

        const { amount, payout_for } = req.body;

        if (!amount || !payout_for) {
            return res.status(400).json({
                success: false,
                message: "broker_id, amount and payout_for are required",
            });
        }

        const validEnums = ["EASYGOLD_TOKEN", "PRIMEINVEST", "GOLDFLEX", "B2B_DASHBOARD"];
        if (!validEnums.includes(payout_for)) {
            return res.status(400).json({
                success: false,
                message: `payout_for must be one of: ${validEnums.join(", ")}`,
            });
        }

        // Create new payout request
        const newRequest = await db.BrokerPayoutRequests.create({
            broker_id,
            amount,
            payout_for,
            status: "PENDING",
        });

        const userDetails = brokerDetails?.user;
        const metas = userDetails?.user_meta || [];

        const user_email = userDetails?.user_email;
        const company = metas.find(m => m.meta_key === "u_company")?.meta_value;
        const street = metas.find(m => m.meta_key === "u_street")?.meta_value;
        const location = metas.find(m => m.meta_key === "u_location")?.meta_value;
        const postcode = metas.find(m => m.meta_key === "u_postcode")?.meta_value;
        const phone = metas.find(m => m.meta_key === "u_phone")?.meta_value;
        const web_site = metas.find(m => m.meta_key === "u_web_site")?.meta_value;
        const account_owner = metas.find(m => m.meta_key === "u_account_owner")?.meta_value;
        const bank = metas.find(m => m.meta_key === "u_bank")?.meta_value;
        const language = metas.find(m => m.meta_key === "language")?.meta_value;
        const iban = metas.find(m => m.meta_key === "u_iban")?.meta_value;
        const bic = metas.find(m => m.meta_key === "u_bic")?.meta_value;
        const addressMap = companyAddressMap();
        const to_company_address = addressMap[payout_for] || "";

        // Format payout_request_id to 5 digits (zero-padded)
        const formattedPayoutRequestId = String(newRequest?.id || '').padStart(5, '0');

        const paylodForMailPDF = {
            logo: await generateImageUrl(brokerDetails?.logo, 'profile'),
            company,
            name: account_owner,
            postcode,
            city: location,
            phone,
            user_email,
            web_site,
            payout_request_id: formattedPayoutRequestId,
            payout_for: payoutForType(payout_for),
            amount: amount,
            street,
            bank,
            iban,
            bic,
            to_company_address,
            date: "20/05/2025",
            time: "20:05:12",
        }

        const outputFileName = `payout_${paylodForMailPDF.payout_request_id}.pdf`;

        const pdfResult = await generatePDF(
            paylodForMailPDF,
            language.includes("de") ? "payout_template_de.html" : "payout_template_en.html",
            "payouts",
            outputFileName
        );

        let relativeInvoicePath = pdfResult.filePath.split("uploads")[1];
        relativeInvoicePath = relativeInvoicePath.replace("\\uploads", "");
        relativeInvoicePath = relativeInvoicePath.replace(/\\/g, "/");

        if (!relativeInvoicePath.startsWith("/")) {
            relativeInvoicePath = "/" + relativeInvoicePath;
        }

        console.log("relativeInvoicePath:", relativeInvoicePath);

        if (pdfResult.success) {
            await newRequest.update({
                invoice: relativeInvoicePath
            });
        }
        const templateVariables = {
            invoice_number: newRequest?.id || formattedPayoutRequestId,
        };

        const emailData = await getRenderedEmail(87, language, templateVariables);

        const formatBrokerDetails = (isGerman) => {
            const details = [];
            if (company) details.push(company);
            if (account_owner) details.push(account_owner);
            if (user_email) details.push(` ${user_email}`);
            return details.join('<br>');
        };

        const isGerman = language?.includes("de");
        const brokerDetailsHtml = formatBrokerDetails(isGerman);
        let updatedHtmlContent = emailData.htmlContent;

        if (isGerman) {
            updatedHtmlContent = updatedHtmlContent.replace(
                /(Ihr Team)/gi,
                `$1<br><br>${brokerDetailsHtml}`
            );
        } else {
            updatedHtmlContent = updatedHtmlContent.replace(
                /(Your team)/gi,
                `$1<br><br>${brokerDetailsHtml}`
            );
        }

        const attachmentPath = pdfResult?.success ? pdfResult.filePath : null;
        const cc = user_email;
        await SendEmailHelper(emailData.subject, updatedHtmlContent, process.env.EASY_GOLD_SUPPORT_EMAIL, attachmentPath, cc);

        return res.status(200).json({
            success: true,
            message: "Payout request created successfully.",
            data: newRequest
        });
    } catch (error) {
        console.error("Error creating payout request:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = CreateBrokerPayoutRequest;
