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
                                meta_key: ["language", "u_web_site", "u_phone", "u_company", "u_street_no", "u_street", "u_postcode", "u_location", "u_country", "u_account_owner", "banks", "affiliate_banks", "ac_holder_name", "iban", "bic_swift_code", "bank_name"]
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
                                    meta_key: ["language", "u_web_site", "u_phone", "u_company", "u_street_no", "u_street", "u_postcode", "u_location", "u_country", "u_account_owner", "banks", "affiliate_banks", "ac_holder_name", "iban", "bic_swift_code", "bank_name"]
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
        const language = metas.find(m => m.meta_key === "language")?.meta_value || "en";
        const isGerman = language?.includes("de");

        const bankMetaVal = metas.find(m => m.meta_key === "banks" || m.meta_key === "affiliate_banks")?.meta_value;
        let parsedBanks = null;
        if (bankMetaVal) {
            try {
                parsedBanks = typeof bankMetaVal === "string" ? JSON.parse(bankMetaVal) : bankMetaVal;
            } catch (e) { }
        }

        const allBanks = [];

        if (Array.isArray(parsedBanks)) {
            parsedBanks.forEach((b) => {
                if (b && (b.bank_name || b.iban || b.account_holder || b.account_number)) {
                    allBanks.push({
                        type: b.type || "",
                        holder: b.account_holder || b.ac_holder_name || account_owner || "",
                        bank: b.bank_name || "",
                        iban: b.iban || "",
                        account_number: b.account_number || "",
                        bic: b.bic_swift || b.bic_swift_code || b.swift_bic || "",
                        routing_number: b.routing_number || "",
                        account_type: b.account_type || "",
                        bank_address: b.bank_address || "",
                        correspondent_bank: b.correspondent_bank || ""
                    });
                }
            });
        } else if (parsedBanks && typeof parsedBanks === "object") {
            if (Array.isArray(parsedBanks.sepa)) {
                parsedBanks.sepa.forEach((b) => {
                    if (b && (b.bank_name || b.iban || b.account_holder)) {
                        allBanks.push({
                            type: "SEPA",
                            holder: b.account_holder || account_owner || "",
                            bank: b.bank_name || "",
                            iban: b.iban || "",
                            bic: b.bic_swift || b.bic_swift_code || "",
                            bank_address: b.bank_address || ""
                        });
                    }
                });
            }
            if (Array.isArray(parsedBanks.swift)) {
                parsedBanks.swift.forEach((b) => {
                    if (b && (b.bank_name || b.iban || b.account_holder || b.swift_bic || b.account_number)) {
                        allBanks.push({
                            type: "SWIFT",
                            holder: b.account_holder || account_owner || "",
                            bank: b.bank_name || "",
                            swift_bic: b.swift_bic || b.bic_swift || "",
                            account_number: b.account_number || "",
                            iban: b.iban || "",
                            bank_address: b.bank_address || "",
                            correspondent_bank: b.correspondent_bank || ""
                        });
                    }
                });
            }
            if (Array.isArray(parsedBanks.ach)) {
                parsedBanks.ach.forEach((b) => {
                    if (b && (b.bank_name || b.account_number || b.account_holder || b.routing_number)) {
                        allBanks.push({
                            type: "ACH",
                            holder: b.account_holder || account_owner || "",
                            bank: b.bank_name || "",
                            routing_number: b.routing_number || "",
                            account_number: b.account_number || "",
                            account_type: b.account_type || "",
                            bank_address: b.bank_address || ""
                        });
                    }
                });
            }
        }

        // Fallback if no structured bank list present
        if (allBanks.length === 0) {
            const bankDetails = brokerDetails?.bank_details || {};
            const holder = bankDetails?.ac_holder_name || metas.find(m => m.meta_key === "ac_holder_name")?.meta_value || account_owner || "";
            const bank = bankDetails?.bank_name || metas.find(m => m.meta_key === "bank_name")?.meta_value || "";
            const iban = bankDetails?.iban || metas.find(m => m.meta_key === "iban")?.meta_value || "";
            const bic = bankDetails?.bic_swift_code || metas.find(m => m.meta_key === "bic_swift_code")?.meta_value || "";

            if (holder || bank || iban || bic) {
                allBanks.push({ holder, bank, iban, bic });
            }
        }

        const account_holder = allBanks[0]?.holder || account_owner || "";
        const bank = allBanks[0]?.bank || "";
        const iban = allBanks[0]?.iban || "";
        const bic = allBanks[0]?.bic || allBanks[0]?.swift_bic || "";

        const all_banks_html = allBanks.map((b, idx) => {
            let labelHeader = null;
            if (b.type === "SEPA") {
                labelHeader = "SEPA / IBAN";
            } else if (b.type === "SWIFT") {
                labelHeader = isGerman ? "Internationale SWIFT-Überweisungen" : "International SWIFT Transfer";
            } else if (b.type === "ACH") {
                labelHeader = "ACH (USA)";
            } else if (b.type) {
                labelHeader = `${b.type} Bank`;
            } else if (allBanks.length > 1) {
                labelHeader = `${isGerman ? 'Bankkonto' : 'Bank Account'} ${idx + 1}`;
            }
            let block = '<div style="display: table-cell; vertical-align: top; padding-left: 5px; word-break: break-word;">';
            if (labelHeader) {
                block += `<div style="font-weight: 700; margin-bottom: 2px;">${labelHeader}</div>`;
            }
            if (b.holder) block += `${isGerman ? 'Kontoinhaber' : 'Account holder'}: ${b.holder}<br>`;
            if (b.bank) block += `${isGerman ? 'Bank' : 'Bank'}: ${b.bank}<br>`;
            if (b.type === 'SEPA' && (b.bic || b.bic_swift)) {
                block += `${isGerman ? 'BIC' : 'BIC'}: ${b.bic || b.bic_swift}<br>`;
            } else if (b.swift_bic || b.bic || b.bic_swift) {
                block += `${isGerman ? 'SWIFT/BIC' : 'SWIFT/BIC'}: ${b.swift_bic || b.bic || b.bic_swift}<br>`;
            }
            if (b.routing_number) block += `${isGerman ? 'Routing-Nr.' : 'Routing No.'}: ${b.routing_number}<br>`;
            if (b.account_number) block += `${isGerman ? 'Konto-Nr.' : 'Account No.'}: ${b.account_number}<br>`;
            if (b.iban) block += `${isGerman ? 'IBAN' : 'IBAN'}: ${b.iban}<br>`;
            if (b.account_type) block += `${isGerman ? 'Kontotyp' : 'Account Type'}: ${b.account_type}<br>`;
            if (b.bank_address) block += `${isGerman ? 'Bankadresse' : 'Bank Address'}: ${b.bank_address}<br>`;
            if (b.correspondent_bank) block += `${isGerman ? 'Korrespondenzbank' : 'Correspondent Bank'}: ${b.correspondent_bank}<br>`;
            block += '</div>';
            return block;
        }).join('');

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

        const headerName = account_holder || account_owner || userDetails?.user_nicename || userDetails?.user_login || "";

        const paylodForMailPDF = {
            logo: await generateImageUrl(brokerDetails?.logo, 'profile'),
            company,
            name: headerName,
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
            holder_name: headerName,
            bank,
            iban,
            bic,
            all_banks_html: all_banks_html || `<div style="display: table-cell; vertical-align: top; padding-left: 5px; word-break: break-word;">${isGerman ? 'Kontoinhaber' : 'Account holder'}: ${account_holder || account_owner || ''}<br>${isGerman ? 'Bank' : 'Bank'}: ${bank || ''}<br>IBAN: ${iban || ''}<br>BIC: ${bic || ''}</div>`,
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
