const db = require("../models");
const { generatePDF } = require("./pdfGenerator");
require("dotenv").config();

const generatePartnerShipPDF = async (data) => {
    try {
        let pdfData = data;
        
        let inc_partnership_doc = `inc_parternership_doc_${Date.now()}.pdf`;
        let llc_partnership_doc = `llc_parternership_doc_${Date.now()}.pdf`;

        await generatePDF(pdfData, "inc_parternership.html", "agreements", inc_partnership_doc);
        await generatePDF(pdfData, "llc_parternership.html", "agreements", llc_partnership_doc);

        return { inc_partnership_doc, llc_partnership_doc };
    } catch (error) {
        console.error(`[EmailTemplateHelper] Error fetching template:`, error.message);
        throw error;
    }
};

module.exports = {
    generatePartnerShipPDF
};