const db = require("../../models");
const { Op } = require("sequelize");

const GetAllCustomerContract = async (req, res) => {
    try {
        const { user } = req.user;

        // Get broker details
        const broker = await db.Brokers.findOne({
            where: { user_id: user.ID },
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["display_name", "landing_page", "mystorekey", "user_email"]
                }
            ]
        });

        if (!broker) {
            return res.status(404).json({
                success: false,
                message: "Broker not found",
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";

        const whereClause = {
            broker_id: broker.id,
            pdf_url: {
                [Op.ne]: null,
            },
        };

        // ✅ GLOBAL SEARCH (customer + broker + user)
        if (search) {
            whereClause[Op.or] = [
                { customer_name: { [Op.like]: `%${search}%` } },
                { customer_email: { [Op.like]: `%${search}%` } },

                // 🔥 IMPORTANT: use $alias.field$
                { "$broker.user.user_email$": { [Op.like]: `%${search}%` } },
                { "$broker.user.display_name$": { [Op.like]: `%${search}%` } },
            ];
        }

        const includeConfig = [
            {
                model: db.Brokers,
                as: "broker",
                attributes: ["id", "user_id", "referral_code"],
                required: false,
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["ID", "user_email", "display_name"],
                        required: false,
                    },
                ],
            },
        ];

        // ✅ FIXED COUNT QUERY
        const totalCount = await db.TargetCustomers.count({
            where: whereClause,
            include: includeConfig,   // 🔥 REQUIRED
            distinct: true,           // 🔥 REQUIRED
        });

        // ✅ MAIN QUERY
        const targetCustomers = await db.TargetCustomers.findAll({
            where: whereClause,
            include: includeConfig,
            order: [["createdAt", "DESC"]],
            limit,
            offset,
            subQuery: false, // 🔥 IMPORTANT for nested search
        });

        const customersWithPdfUrl = targetCustomers.map(c => {
            const customer = c.toJSON();

            if (customer.pdf_url) {
                customer.pdf_url = `${process.env.NODE_URL}${customer.pdf_url}`;
            }

            return customer;
        });

        return res.status(200).json({
            success: true,
            message: "All target customers retrieved successfully",
            data: {
                customers: customersWithPdfUrl,
                total: totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                limit,
            },
        });

    } catch (error) {
        console.error("Error fetching all target customers:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = GetAllCustomerContract;