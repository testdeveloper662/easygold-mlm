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

const generateTargetCustomerPDF = async (data) => {
    try {

        const productDocMap = {
            easygold: "b2c_easygold",
            primeinvest: "b2c_primeinvest",
            goldflex: "b2c_goldflex"
        };

        const documentKey = productDocMap[data.product_type];

        if (!documentKey) {
            throw new Error(`Invalid product_type: ${data.product_type}`);
        }

        // Fetch only the required contract
        const contract = await db.AdminContracts.findOne({
            attributes: [
                "document_key",
                "english_template_text",
                "german_template_text",
                "english_name",
                "german_name"
            ],
            where: {
                document_key: documentKey
            }
        });

        if (!contract) {
            throw new Error(`Contract not found for ${documentKey}`);
        }

        // Language fallback
        let templateHtml =
            data.language === "de-DE"
                ? (contract.german_template_text?.trim() || contract.english_template_text?.trim())
                : contract.english_template_text?.trim();

        if (!templateHtml) {
            throw new Error("Template content is empty");
        }

        // Replace placeholders
        templateHtml = replaceContractVariables(templateHtml, data);

        const pdf_doc = `${contract.document_key}_${Date.now()}.pdf`;

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
            pdf_doc
        );

        return { pdf_doc };

    } catch (error) {
        console.error("[generateTargetCustomerPDF] Error:", error.message);
        throw error;
    }
};

module.exports = {
    generateTargetCustomerPDF
};