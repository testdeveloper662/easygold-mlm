const db = require("../../models");
const { Op } = require("sequelize");

const GetAllCustomerContract = async (req, res) => {
    try {
        const { user } = req.user;

        const targetUserId = (user.role === "SUPER_ADMIN" && req.query.viewUserId)
            ? parseInt(req.query.viewUserId)
            : user.ID;

        // Get broker details
        const broker = await db.Brokers.findOne({
            where: { user_id: targetUserId },
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

            // Confirmed unused anywhere in BrokerContracts.tsx (the sole consumer).
            const {
                referral_code_id: __u1, parent_customer_id: __u2, referral_code: __u3,
                referred_by_code: __u4, telephone: __u5, tax_id: __u6,
                consent_at: __u7, children_count: __u8, bonus_points: __u9,
                status: __u10, updatedAt: __u11,
                ...trimmedCustomer
            } = customer;

            return trimmedCustomer;
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