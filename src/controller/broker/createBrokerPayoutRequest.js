require("dotenv").config();
const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const { companyAddressMap, generateImageUrl, payoutForType, textForType } = require("../../utils/Helper");
const { generatePDF } = require("../../utils/pdfGenerator");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const CreateBrokerPayoutRequest = async (req, res) => {
    try {
        const user = req?.user?.user;
        let broker_id = user?.broker_id || user?.affiliate_id;
        if (!broker_id && user?.ID) {
            const b = await db.Brokers.findOne({ where: { user_id: user.ID }, attributes: ["id"] })
                || (db.Affiliates ? await db.Affiliates.findOne({ where: { user_id: user.ID }, attributes: ["id"] }) : null);
            if (b) broker_id = b.id;
        }
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
                                meta_key: ["language", "u_web_site", "u_phone", "u_company", "u_street_no", "u_street", "u_postcode", "u_location", "u_country", "u_account_owner", "banks"]
                            },
                            required: false
                        },
                    ]
                },
                {
                    model: db.BrokerBankDetails,
                    as: "bank_details",
                    attributes: ["ac_holder_name", "iban", "bic_swift_code", "bank_name"]
                }
            ]
        });

        if (!brokerDetails && db.Affiliates) {
            brokerDetails = await db.Affiliates.findOne({
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
                                    meta_key: ["language", "u_web_site", "u_phone", "u_company", "u_street_no", "u_street", "u_postcode", "u_location", "u_country", "u_account_owner"]
                                },
                                required: false
                            },
                        ]
                    },
                    {
                        model: db.BrokerBankDetails,
                        as: "bank_details",
                        attributes: ["ac_holder_name", "iban", "bic_swift_code", "bank_name"]
                    }
                ]
            });
        }
        brokerDetails = brokerDetails?.get({ plain: true });
        if (!brokerDetails) {
            return res.status(404).json({
                success: false,
                message: "Broker not found.",
            });
        }
        console.log("brokerDetails= ", brokerDetails);

        const { amount, payout_for, user_type = "broker" } = req.body;

        if (!amount || !payout_for) {
            return res.status(400).json({
                success: false,
                message: "broker_id, amount and payout_for are required",
            });
        }

        const validEnums = ["EASYGOLD_TOKEN", "PRIMEINVEST", "GOLDFLEX", "B2B_DASHBOARD"];
        if (!validEnums?.includes(payout_for)) {
            return res.status(400).json({
                success: false,
                message: `payout_for must be one of: ${validEnums.join(", ")}`,
            });
        }

        // Create new payout request
        let newRequest;
        if (user_type === "affiliate" && db.AffiliatePayoutRequests) {
            let aff_id = user?.affiliate_id;
            if (!aff_id && user?.ID && db.Affiliates) {
                const aff = await db.Affiliates.findOne({ where: { user_id: user.ID }, attributes: ["id"] });
                if (aff) aff_id = aff.id;
            }
            if (!aff_id) aff_id = broker_id;

            newRequest = await db.AffiliatePayoutRequests.create({
                affiliate_id: aff_id,
                amount,
                payout_for,
                status: "PENDING",
            });
        } else {
            newRequest = await db.BrokerPayoutRequests.create({
                broker_id,
                amount,
                payout_for,
                status: "PENDING",
            });
        }

        const userDetails = brokerDetails?.user;
        const metas = userDetails?.user_meta || [];

        const user_email = userDetails?.user_email;
        const company = metas.find(m => m.meta_key === "u_company")?.meta_value;
        const street_no = metas.find(m => m.meta_key === "u_street_no")?.meta_value;
        const street = metas.find(m => m.meta_key === "u_street")?.meta_value;
        const location = metas.find(m => m.meta_key === "u_location")?.meta_value;
        const postcode = metas.find(m => m.meta_key === "u_postcode")?.meta_value;
        const country = metas.find(m => m.meta_key === "u_country")?.meta_value;
        const phone = metas.find(m => m.meta_key === "u_phone")?.meta_value;
        const web_site = metas.find(m => m.meta_key === "u_web_site")?.meta_value;
        const account_owner = metas.find(m => m.meta_key === "u_account_owner")?.meta_value;
        const bankMetaVal = metas.find(m => m.meta_key === "banks")?.meta_value;
        let parsedBanks = null;
        if (bankMetaVal) {
            try {
                parsedBanks = typeof bankMetaVal === "string" ? JSON.parse(bankMetaVal) : bankMetaVal;
            } catch (e) {}
        }
        let primarySepa = {};
        let primarySwift = {};
        let primaryAch = {};
        if (Array.isArray(parsedBanks)) {
            primarySepa = parsedBanks[0] || {};
        } else if (parsedBanks && typeof parsedBanks === "object") {
            primarySepa = parsedBanks.sepa?.[0] || {};
            primarySwift = parsedBanks.swift?.[0] || {};
            primaryAch = parsedBanks.ach?.[0] || {};
        }
        const bankDetails = brokerDetails?.bank_details || {};

        const account_holder = primarySepa.account_holder || primarySwift.account_holder || primaryAch.account_holder || bankDetails?.ac_holder_name;
        const bank = primarySepa.bank_name || primarySwift.bank_name || primaryAch.bank_name || bankDetails?.bank_name;
        const iban = primarySepa.iban || primarySwift.iban || bankDetails?.iban;
        const bic = primarySepa.bic_swift || primarySwift.swift_bic || bankDetails?.bic_swift_code;

        // Use logged-in user's language stored in user_meta
        const language = metas.find(m => m.meta_key === "language")?.meta_value || "en";
        const addressMap = companyAddressMap();
        const to_company_address = addressMap[payout_for] || "";

        // Format payout_request_id to 5 digits (zero-padded)
        const formattedPayoutRequestId = String(newRequest?.id || '').padStart(5, '0');

        const now = new Date();

        // format date DD/MM/YYYY
        const date =
            String(now.getDate()).padStart(2, "0") + "/" +
            String(now.getMonth() + 1).padStart(2, "0") + "/" +
            now.getFullYear();

        // format time HH:MM:SS
        const time =
            String(now.getHours()).padStart(2, "0") + ":" +
            String(now.getMinutes()).padStart(2, "0") + ":" +
            String(now.getSeconds()).padStart(2, "0");

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
            payout_for: payoutForType(payout_for, language),
            extra_text: textForType(payout_for, language),
            amount: amount,
            street,
            holder_name: account_holder || account_owner,
            bank,
            iban,
            bic,
            to_company_address,
            date,
            time,
        };

        const outputFileName = `payout_${paylodForMailPDF.payout_request_id}.pdf`;

        let relativeInvoicePath = null;

        const pdfResult = await generatePDF(
            paylodForMailPDF,
            language?.includes("de")
                ? "payout_template_de.html"
                : "payout_template_en.html",
            "payouts",
            outputFileName
        );

        // ✅ CHECK PDF SUCCESS FIRST
        if (pdfResult?.success && pdfResult?.filePath) {
            relativeInvoicePath = pdfResult.filePath.split("uploads")[1];
            relativeInvoicePath = relativeInvoicePath.replace("\\uploads", "");
            relativeInvoicePath = relativeInvoicePath.replace(/\\/g, "/");

            if (!relativeInvoicePath.startsWith("/")) {
                relativeInvoicePath = "/" + relativeInvoicePath;
            }

            console.log("relativeInvoicePath:", relativeInvoicePath);

            await newRequest.update({
                invoice: relativeInvoicePath
            });
        } else {
            console.error("PDF generation failed:", pdfResult);
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

        const attachmentPath =
            pdfResult?.success && pdfResult?.filePath
                ? pdfResult.filePath
                : null;
        const cc = user_email;
        await SendEmailHelper(emailData.subject, updatedHtmlContent, process.env.EASY_GOLD_SUPPORT_EMAIL, attachmentPath, cc);

        // Send admin payout request notification email (template 137) to hsn_shop88@yahoo.de using logged-in user's language
        try {
            const isAffiliate = user_type === "affiliate";
            const userRoleText = isAffiliate ? "Affiliate" : "Broker";
            const fullAddress = [street_no, street, location, postcode, country]
                .filter(val => val !== undefined && val !== null && String(val).trim() !== "")
                .join(", ") || "-";

            const adminNotificationVariables = {
                broker_or_affiliate: userRoleText,
                Broker_or_Affiliate: userRoleText,
                amount: `€${parseFloat(amount).toFixed(2)}`,
                request_date: date,
                name: account_owner || userDetails?.user_nicename || userDetails?.user_login || "-",
                email: user_email || "-",
                phone: phone || "-",
                full_address: fullAddress,
                account_id: userDetails?.ID || broker_id || "-",
            };

            const adminEmailData = await getRenderedEmail(137, language, adminNotificationVariables);
            await SendEmailHelper(
                adminEmailData.subject,
                adminEmailData.htmlContent,
                process.env.ADMIN_NOTIFICATION_EMAIL || "hsn_shop88@yahoo.de",
                attachmentPath
            );
        } catch (adminMailError) {
            console.error("Error sending admin payout notification email (template 137):", adminMailError);
        }

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
