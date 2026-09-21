const { TermsAndCondition } = require("../../models");

const getPublicTermsAndConditions = async (req, res) => {
    try {
        const { document_key } = req.params;

        const term = await TermsAndCondition.findOne({
            where: {
                document_key: document_key
            }
        });

        if (!term) {
            return res.status(404).json({
                success: false,
                message: "Terms and conditions not found",
            });
        }

        res.status(200).json({
            success: true,
            data: term,
        });
    } catch (error) {
        console.error("Error fetching public terms and conditions:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching terms and conditions",
        });
    }
};

module.exports = getPublicTermsAndConditions;
