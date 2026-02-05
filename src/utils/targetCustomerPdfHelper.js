const db = require("../models");
const { generatePDF } = require("./pdfGenerator");
require("dotenv").config();

const generateTargetCustomerPDF = async (data) => {
    try {
        let pdfData = data;
        let pdf_doc = null;

        if (data.product_type == "easygold") {
            pdf_doc = `b2c_easygold${Date.now()}.pdf`;
            await generatePDF(pdfData, "b2c_easygold.html", "agreements", pdf_doc);
        } else if (data.product_type == "primeinvest") {
            pdf_doc = `b2c_primeinvest${Date.now()}.pdf`;
            await generatePDF(pdfData, "b2c_primeinvest.html", "agreements", pdf_doc);
        } else if (data.product_type == "goldflex") {
            pdf_doc = `b2c_goldflex${Date.now()}.pdf`;
            await generatePDF(pdfData, "b2c_goldflex.html", "agreements", pdf_doc);
        }

        return { pdf_doc };
    } catch (error) {
        console.error(`[EmailTemplateHelper] Error fetching template:`, error.message);
        throw error;
    }
};

module.exports = {
    generateTargetCustomerPDF
};