const db = require("../../models");

const updateTermsAndCondition = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            english_name,
            german_name,
            english_template_text,
            german_template_text,
            description,
            showonregister,
            document_key
        } = req.body;

        const term = await db.TermsAndCondition.findOne({
            where: { id },
        });

        if (!term) {
            return res.status(404).json({
                success: false,
                message: "Terms and condition not found.",
            });
        }

        let englishPdf = term.english_pdf_file;
        let germanPdf = term.german_pdf_file;

        if (req.files?.english_pdf_file) {
            englishPdf = req.files.english_pdf_file[0].filename;
        }

        if (req.files?.german_pdf_file) {
            germanPdf = req.files.german_pdf_file[0].filename;
        }

        // Reserved entries are looked up by document_key from other parts of
        // the app (e.g. the broker product-link declaration); their name and
        // key must stay fixed so that lookup never breaks.
        const RESERVED_DOCUMENT_KEYS = ["broker_product_declaration"];
        const isReservedEntry = RESERVED_DOCUMENT_KEYS.includes(term.document_key);

        await term.update({
            english_name: isReservedEntry ? term.english_name : english_name,
            german_name: isReservedEntry ? term.german_name : german_name,
            english_template_text,
            german_template_text,
            english_pdf_file: englishPdf,
            german_pdf_file: germanPdf,
            description,
            showonregister: showonregister === 'true' || showonregister === true,
            document_key: isReservedEntry ? term.document_key : document_key
        });

        return res.status(200).json({
            success: true,
            message: "Terms and condition updated successfully.",
            data: term,
        });
    } catch (error) {
        console.error("Error updating terms and condition:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = updateTermsAndCondition;
