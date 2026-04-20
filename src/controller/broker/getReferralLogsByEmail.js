const db = require("../../models");

const GetReferralLogsByEmail = async (req, res) => {
    try {
        const { email } = req.query; // ✅ use email

        const { page = 1, limit = 10, search, product } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const offset = (page - 1) * limit;

        // ✅ Find customer by email
        const customer = await db.TargetCustomers.findOne({
            where: { customer_email: email },
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        const customerId = customer.id;

        // ✅ Same logic as before
        const where = {
            [db.Sequelize.Op.or]: [
                { from_customer_id: customerId },
                { to_customer_id: customerId },
            ],
        };

        let productMap = {
            primeinvest: "Primeinvest",
            goldflex: "goldflex",
            easygold: "easygold Token"
        };

        const normalizedProduct = productMap[product?.toLowerCase()];

        if (normalizedProduct) {
            where.product = normalizedProduct;
        }

        console.log(normalizedProduct, "normalizedproduct");

        if (search) {
            const searchConditions = [
                {
                    "$fromCustomer.customer_name$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },
                {
                    "$fromCustomer.customer_email$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },
                {
                    "$toCustomer.customer_name$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },
                {
                    "$toCustomer.customer_email$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                }
            ];

            where[db.Sequelize.Op.and] = [
                {
                    [db.Sequelize.Op.or]: searchConditions,
                },
            ];
        }

        const { count, rows } =
            await db.TargetCustomerReferralLogs.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [["createdAt", "DESC"]],
                include: [
                    {
                        model: db.TargetCustomers,
                        as: "fromCustomer",
                        attributes: ["id", "customer_name", "customer_email"],
                    },
                    {
                        model: db.TargetCustomers,
                        as: "toCustomer",
                        attributes: ["id", "customer_name", "customer_email"],
                    },
                    {
                        model: db.Brokers,
                        as: "broker",
                        attributes: ["id"],
                        include: [
                            {
                                model: db.Users,
                                as: "user",
                                attributes: ["user_email", "display_name"],
                            },
                        ],
                    },
                ],
            });

        const formattedData = rows.map((log) => ({
            id: log.id,
            type: log.type,

            from_customer_name: log.fromCustomer?.customer_name || null,
            from_customer_email: log.fromCustomer?.customer_email || null,

            to_customer_name: log.toCustomer?.customer_name || null,
            to_customer_email: log.toCustomer?.customer_email || null,

            broker_name: log.broker?.user?.display_name || null,
            broker_email: log.broker?.user?.user_email || null,

            investment_amount: log.investment_amount,
            commission_amount: log.commission_amount,
            product: log.product,
            status: log.status,

            tracking_number: log.tracking_number,
            tracking_link: log.tracking_link,
            remark: log.remark,

            createdAt: log.createdAt,
        }));

        return res.json({
            success: true,
            customer,
            data: formattedData,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
            },
        });
    } catch (err) {
        console.error("GetReferralLogsByEmail error:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = GetReferralLogsByEmail;