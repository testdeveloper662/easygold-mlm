const db = require("../../models");

const UpdateAdminContract = async (req, res) => {
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

        const contract = await db.AdminContracts.findOne({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Admin contract not found.",
            });
        }

        let englishPdf = contract.english_pdf_file;
        let germanPdf = contract.german_pdf_file;

        if (req.files?.english_pdf_file) {
            englishPdf = req.files.english_pdf_file[0].filename;
        }

        if (req.files?.german_pdf_file) {
            germanPdf = req.files.german_pdf_file[0].filename;
        }

        await contract.update({
            english_name,
            german_name,
            english_template_text,
            german_template_text,
            english_pdf_file: englishPdf,
            german_pdf_file: germanPdf,
            description,
            showonregister,
            document_key
        });

        return res.status(200).json({
            success: true,
            message: "Admin contract updated successfully.",
            data: contract,
        });
    } catch (error) {
        console.error("Error updating admin contract:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = UpdateAdminContract;