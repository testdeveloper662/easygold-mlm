const db = require("../../models");
const BASE_URL = process.env.NODE_URL;

const GetAdminContractById = async (req, res) => {
    try {
        const { id } = req.params;

        const contract = await db.AdminContracts.findOne({
            where: { id },
        });

        if (!contract) {
            return res.status(404).json({
                success: false,
                message: "Admin contract not found.",
            });
        }

        const item = contract.toJSON();

        const formattedData = {
            ...item,
            english_pdf_file: item.english_pdf_file
                ? `${BASE_URL}uploads/contracts/${item.english_pdf_file}`
                : null,
            german_pdf_file: item.german_pdf_file
                ? `${BASE_URL}uploads/contracts/${item.german_pdf_file}`
                : null,
        };

        return res.status(200).json({
            success: true,
            message: "Admin contract fetched successfully.",
            data: formattedData,
        });
    } catch (error) {
        console.error("Error fetching admin contract:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = GetAdminContractById;