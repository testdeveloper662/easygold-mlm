const db = require("../models");
const { generatePDF } = require("./pdfGenerator");
require("dotenv").config();

function getMeta(user, key) {
    return user?.user_meta?.find(m => m.meta_key === key)?.meta_value || "";
}

const generateAgreementPDF = async (data, parentBroker = null) => {
    try {
        let parent_name = "";
        let parent_city = "";
        let parent_address = "";
        let parent_signaturedata = "";
        if (parentBroker) {
            console.log(parentBroker, "parentBroker");
            parent_name = parentBroker?.user?.display_name;
            const streetNo = getMeta(parentBroker.user, "u_street_no");
            const street = getMeta(parentBroker.user, "u_street");
            const location = getMeta(parentBroker.user, "u_location");
            const postcode = getMeta(parentBroker.user, "u_postcode");
            parent_city = location;
            parent_signaturedata = getMeta(parentBroker.user, "signatureData");

            parent_address = `${streetNo} ${street}, ${location} ${postcode}`.trim();
        }


        let pdfData = {
            parent_name: parent_name,
            parent_address: parent_address,
            parent_u_location: parent_city,
            parent_signaturedata: `${process.env.PUBLIC_URL}${parent_signaturedata}`,
            ...data
        };

        console.log(pdfData, "pdfData");
        let maklervertrag_doc = `maklervertrag_doc_${Date.now()}.pdf`;
        let untermaklervertrag_doc = `untermaklervertrag_doc_${Date.now()}.pdf`;;
        if (data.language == "en-US") {
            await generatePDF(pdfData, "maklervertrag_en.html", "agreements", maklervertrag_doc);
            await generatePDF(pdfData, "untermaklervertrag_en.html", "agreements", untermaklervertrag_doc);
        } else {
            await generatePDF(pdfData, "maklervertrag_de.html", "agreements", maklervertrag_doc);
            await generatePDF(pdfData, "untermaklervertrag_de.html", "agreements", untermaklervertrag_doc);
        }

        return { maklervertrag_doc, untermaklervertrag_doc };
    } catch (error) {
        console.error(`[EmailTemplateHelper] Error fetching template:`, error.message);
        throw error;
    }
};

module.exports = {
    generateAgreementPDF
};