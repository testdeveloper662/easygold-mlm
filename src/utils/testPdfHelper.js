const { generatePDF } = require("./pdfGenerator");
require("dotenv").config();

const generateTestPDF = async (data) => {
    try {
        let pdfData = data;

        let test_doc = `test_pdf_${Date.now()}.pdf`;

        await generatePDF(pdfData, "test_pdf.html", "agreements", test_doc);

        return { test_doc };
    } catch (error) {
        console.error(`[EmailTemplateHelper] Error fetching template:`, error.message);
        throw error;
    }
};

module.exports = {
    generateTestPDF
};