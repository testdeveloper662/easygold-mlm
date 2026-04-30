const { Op } = require("sequelize");
const db = require("../models");
const { generatePDF } = require("./pdfGenerator");
require("dotenv").config();

const replaceContractVariables = (html, variables = {}) => {
    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\[${key}\\]`, "g");
        html = html.replace(regex, value ?? "");
    });

    return html;
};

const generatePartnerPDF = async (data) => {
    try {

        // Only allow these documents
        const allowedDocs = [
            "maklervertrag_doc",
            "untermaklervertrag_doc",
            "inc_partnership_doc",
            "llc_partnership_doc",
            "goldflex_partnership_doc",
            "hartmann_benz_gmbh_white-label_service_doc",
            "binding_loi_doc",
            "partner_tax_billing_doc",
            "uk_company_sales_platform_doc"
        ];

        const contracts = await db.AdminContracts.findAll({
            attributes: [
                "id",
                "document_key",
                "english_template_text",
                "german_template_text",
                "english_name",
                "german_name"
            ],
            where: {
                document_key: {
                    [Op.in]: allowedDocs
                }
            }
        });

        console.log("Contracts found:", contracts.length);

        let resultDocs = {};

        for (const contract of contracts) {

            console.log("Generating:", contract.document_key);

            // Language fallback
            let templateHtml =
                data.language === "de-DE"
                    ? (contract.german_template_text?.trim() || contract.english_template_text?.trim())
                    : contract.english_template_text?.trim();

            if (!templateHtml) continue;

            templateHtml = replaceContractVariables(templateHtml, data);

            const fileName = `${contract.document_key}_${Date.now()}.pdf`;

            await generatePDF(
                {
                    header:
                        data.language === "de-DE"
                            ? (contract.german_name || contract.english_name)
                            : contract.english_name,
                    body: templateHtml
                },
                "pdf_template.html",
                "agreements",
                fileName
            );

            resultDocs[contract.document_key] = fileName;
        }

        return resultDocs;

    } catch (error) {
        console.error(error);
        throw error;
    }
};

module.exports = {
    generatePartnerPDF
};