const { TermsAndCondition } = require("../../models");

const getRegisterTerms = async (req, res) => {
    try {
        const terms = await TermsAndCondition.findAll({
            where: {
                showonregister: true
            },
            attributes: ['id', 'document_key', 'english_name', 'german_name'],
            order: [['createdAt', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: terms,
        });
    } catch (error) {
        console.error("Error fetching registration terms:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching registration terms",
        });
    }
};

module.exports = getRegisterTerms;
