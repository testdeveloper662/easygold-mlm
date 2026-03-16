const db = require("../../models");
const BASE_URL = process.env.NODE_URL;

const GetAllAdminContracts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search || "";

        const whereCondition = {};

        if (search) {
            whereCondition[Op.or] = [
                { english_name: { [Op.like]: `%${search}%` } },
                { german_name: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await db.AdminContracts.findAndCountAll({
            where: whereCondition,
            attributes: ["english_name", "german_name", "id", "english_pdf_file", "german_pdf_file", "showonregister"],
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        });

        const contracts = rows.map((item) => ({
            ...item.toJSON(),
            english_pdf_file: item.english_pdf_file
                ? `${BASE_URL}public/uploads/contracts/${item.english_pdf_file}`
                : null,
            german_pdf_file: item.german_pdf_file
                ? `${BASE_URL}public/uploads/contracts/${item.german_pdf_file}`
                : null,
        }));

        return res.status(200).json({
            success: true,
            message: "All Admin conracts fetched successfully.",
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit,
            },
            data: contracts,
        });
    } catch (error) {
        console.error("Error fetching all broker commission history:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = GetAllAdminContracts;
