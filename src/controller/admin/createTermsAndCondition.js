const { TermsAndCondition } = require("../../models");

const createTermsAndCondition = async (req, res) => {
    try {
        const { english_name, german_name, english_template_text, german_template_text, showonregister, document_key } = req.body;

        const english_pdf_file = req.files && req.files["english_pdf_file"] ? req.files["english_pdf_file"][0].filename : null;
        const german_pdf_file = req.files && req.files["german_pdf_file"] ? req.files["german_pdf_file"][0].filename : null;

        const newTerm = await TermsAndCondition.create({
            english_name,
            german_name,
            english_template_text,
            german_template_text,
            english_pdf_file,
            german_pdf_file,
            showonregister: showonregister === "true" || showonregister === "1",
            document_key
        });

        res.status(201).json({
            success: true,
            message: "Terms and conditions created successfully",
            data: newTerm,
        });
    } catch (error) {
        console.error("Error creating terms and conditions:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while creating terms and conditions",
        });
    }
};

module.exports = createTermsAndCondition;
