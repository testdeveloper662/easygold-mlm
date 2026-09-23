const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const { companyAddressMap, generateImageUrl, payoutForType, textForType } = require("../../utils/Helper");
const { generatePDF } = require("../../utils/pdfGenerator");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const CreateExternalPayoutRequest = async (req, res) => {
    try {
        const { email, amount, payout_for } = req.body;

        if (!email || !amount || !payout_for) {
            return res.status(400).json({
                success: false,
                message: "email, amount and payout_for are required",
            });
        }

        const validEnums = ["easygold_token", "primeinvest", "goldflex", "b2b_dashboard"];
        const inputPayoutFor = String(payout_for).toLowerCase();
        
        if (!validEnums.includes(inputPayoutFor)) {
            return res.status(400).json({
                success: false,
                message: `payout_for must be one of: ${validEnums.join(", ")}`,
            });
        }
        
        // Convert to uppercase for database insertion
        const finalPayoutFor = inputPayoutFor.toUpperCase();

        // Fetch user
        const user = await db.Users.findOne({
            where: { user_email: email },
            attributes: ["ID", "user_nicename", "user_login", "user_email", "role_id"],
            include: [
                {
                    model: db.UsersMeta,
                    as: "user_meta",
                    attributes: ["meta_key", "meta_value"],
                    where: {
                        meta_key: ["language", "u_web_site", "u_phone", "u_company", "u_street_no", "u_street", "u_postcode", "u_location", "u_country", "u_account_owner", "banks", "affiliate_banks", "ac_holder_name", "iban", "bic_swift_code", "bank_name"]
                    },
                    required: false
                }
            ]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const targetUserId = user.ID;
        let broker_id = null;

        // Try to get broker_id for legacy reference
        if (user.role_id === 2 || user.role_id === 3) {
            const b = await db.Brokers.findOne({ where: { user_id: targetUserId }, attributes: ["id", "logo"] });
            if (b) {
                broker_id = b.id;
                user.logo = b.logo; // Keep logo for PDF
            }
        }

        // Validate Balance
        const sumCommissions = await db.BrokerCommissionHistory.sum('commission_amount', {
            where: {
                user_id: targetUserId,
                is_deleted: false,
                is_payment_done: true,
                order_type: inputPayoutFor // lowercase for commission history
            }
        }) || 0;

        const sumPayouts = await db.BrokerPayoutRequests.sum('amount', {
            where: {
                user_id: targetUserId,
                payout_for: finalPayoutFor,
                status: "APPROVED" // Assuming we subtract APPROVED payouts
            }
        }) || 0;

        const availableBalance = sumCommissions - sumPayouts;

        if (amount > availableBalance) {
            return res.status(400).json({
                success: false,
                message: `Insufficient balance. Available: ${availableBalance}`
            });
        }

        // Create new payout request
        const newRequest = await db.BrokerPayoutRequests.create({
            broker_id: broker_id || null,
            user_id: targetUserId,
            amount,
            payout_for: finalPayoutFor,
            status: "PENDING",
        });

        const metas = user.user_meta || [];
        const company = metas.find(m => m.meta_key === "u_company")?.meta_value;
        const street_no = metas.find(m => m.meta_key === "u_street_no")?.meta_value;
        const street = metas.find(m => m.meta_key === "u_street")?.meta_value;
        const location = metas.find(m => m.meta_key === "u_location")?.meta_value;
        const postcode = metas.find(m => m.meta_key === "u_postcode")?.meta_value;
        const country = metas.find(m => m.meta_key === "u_country")?.meta_value;
        const phone = metas.find(m => m.meta_key === "u_phone")?.meta_value;
        const web_site = metas.find(m => m.meta_key === "u_web_site")?.meta_value;
        const account_owner = metas.find(m => m.meta_key === "u_account_owner")?.meta_value;
        const language = metas.find(m => m.meta_key === "language")?.meta_value || "en";
        const isGerman = language.includes("de");

        // Resolve Bank Details
        let parsedBanks = null;
        const banksMeta = metas.find(m => m.meta_key === "banks")?.meta_value;
        if (banksMeta) {
            try {
                parsedBanks = typeof banksMeta === "string" ? JSON.parse(banksMeta) : banksMeta;
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

        const holder = primarySepa.account_holder || primarySwift.account_holder || primaryAch.account_holder || account_owner || "";
        const bank = primarySepa.bank_name || primarySwift.bank_name || primaryAch.bank_name || "";
        const iban = primarySepa.iban || primarySwift.iban || "";
        const bic = primarySepa.bic_swift || primarySwift.swift_bic || "";

        const all_banks_html = `<div style="display: table-cell; vertical-align: top; padding-left: 5px; word-break: break-word;">${isGerman ? 'Kontoinhaber' : 'Account holder'}: ${holder}<br>${isGerman ? 'Bank' : 'Bank'}: ${bank}<br>IBAN: ${iban}<br>BIC: ${bic}</div>`;

        const addressMap = companyAddressMap();
        const to_company_address = addressMap[payout_for] || "";

        const formattedPayoutRequestId = String(newRequest.id).padStart(5, '0');
        const now = new Date();
        const date = String(now.getDate()).padStart(2, "0") + "/" + String(now.getMonth() + 1).padStart(2, "0") + "/" + now.getFullYear();
        const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0") + ":" + String(now.getSeconds()).padStart(2, "0");
        const headerName = holder || account_owner || user.user_nicename || user.user_login || "";

        const paylodForMailPDF = {
            logo: await generateImageUrl(user.logo, 'profile'),
            company,
            name: headerName,
            postcode,
            city: location,
            phone,
            user_email: email,
            web_site,
            payout_request_id: formattedPayoutRequestId,
            payout_for: payoutForType(payout_for, language),
            extra_text: textForType(payout_for, language),
            amount: amount,
            street,
            holder_name: headerName,
            bank,
            iban,
            bic,
            all_banks_html,
            to_company_address,
            date,
            time,
        };

        let relativeInvoicePath = null;
        let pdfResult = null;

        const outputFileName = `payout_${paylodForMailPDF.payout_request_id}.pdf`;

        pdfResult = await generatePDF(
            paylodForMailPDF,
            language.includes("de") ? "payout_template_de.html" : "payout_template_en.html",
            "payouts",
            outputFileName
        );

        if (pdfResult?.success && pdfResult?.filePath) {
            relativeInvoicePath = pdfResult.filePath.split("uploads")[1];
            relativeInvoicePath = relativeInvoicePath.replace("\\\\uploads", "");
            relativeInvoicePath = relativeInvoicePath.replace(/\\\\/g, "/");

            if (!relativeInvoicePath.startsWith("/")) {
                relativeInvoicePath = "/" + relativeInvoicePath;
            }
            await newRequest.update({ invoice: relativeInvoicePath });
        }

        const templateVariables = { invoice_number: newRequest.id || formattedPayoutRequestId };
        const emailData = await getRenderedEmail(87, language, templateVariables);

        const formatBrokerDetails = (isGerman) => {
            const details = [];
            if (company) details.push(company);
            if (account_owner) details.push(account_owner);
            if (email) details.push(` ${email}`);
            return details.join('<br>');
        };

        const brokerDetailsHtml = formatBrokerDetails(isGerman);
        let updatedHtmlContent = emailData.htmlContent;
        if (isGerman) {
            updatedHtmlContent = updatedHtmlContent.replace(/(Ihr Team)/gi, `$1<br><br>${brokerDetailsHtml}`);
        } else {
            updatedHtmlContent = updatedHtmlContent.replace(/(Your team)/gi, `$1<br><br>${brokerDetailsHtml}`);
        }

        const attachmentPath = pdfResult?.success && pdfResult?.filePath ? pdfResult.filePath : null;
        await SendEmailHelper(emailData.subject, updatedHtmlContent, process.env.EASY_GOLD_SUPPORT_EMAIL, attachmentPath, email);

        try {
            const userRoleText = user.role_id === 5 ? "Customer" : (user.role_id === 2 ? "Broker" : "Affiliate");
            const fullAddress = [street_no, street, location, postcode, country].filter(val => val && String(val).trim() !== "").join(", ") || "-";

            const adminNotificationVariables = {
                broker_or_affiliate: userRoleText,
                Broker_or_Affiliate: userRoleText,
                amount: `€${parseFloat(amount).toFixed(2)}`,
                request_date: date,
                name: account_owner || user.user_nicename || user.user_login || "-",
                email: email || "-",
                phone: phone || "-",
                full_address: fullAddress,
                account_id: user.ID || "-",
            };

            const adminEmailData = await getRenderedEmail(137, language, adminNotificationVariables);
            await SendEmailHelper(
                adminEmailData.subject,
                adminEmailData.htmlContent,
                process.env.ADMIN_NOTIFICATION_EMAIL || "hsn_shop88@yahoo.de",
                attachmentPath
            );
        } catch (adminMailError) {
            console.error("Error sending admin notification:", adminMailError);
        }

        return res.status(200).json({
            success: true,
            message: "Payout request created successfully.",
            data: newRequest
        });
    } catch (error) {
        console.error("Error creating external payout request:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = CreateExternalPayoutRequest;
