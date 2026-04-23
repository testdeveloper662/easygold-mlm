const db = require("../../models");

const GetAllReferralLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const { user } = req.user;

        const broker_id = user.broker_id;

        const { page = 1, limit = 10, search, product } = req.query;

        const offset = (page - 1) * limit;

        const customer = await db.TargetCustomers.findByPk(id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        const customerId = parseInt(id);

        const where = {
            [db.Sequelize.Op.or]: [
                { from_customer_id: customerId },
                { to_customer_id: customerId },
            ],
        };

        if (search) {
            const searchConditions = [
                // 👤 from customer
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

                // 👤 to customer
                {
                    "$toCustomer.customer_name$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },
                {
                    "$toCustomer.customer_email$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },

                // 📦 product
                {
                    product: {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },
            ];

            // ✅ ONLY add these when broker_id is NOT present
            if (!broker_id) {
                searchConditions.push(
                    {
                        "$broker.user.user_email$": {
                            [db.Sequelize.Op.like]: `%${search}%`,
                        },
                    },
                    {
                        "$broker.user.display_name$": {
                            [db.Sequelize.Op.like]: `%${search}%`,
                        },
                    },
                    {
                        status: {
                            [db.Sequelize.Op.like]: `%${search}%`,
                        },
                    }
                );
            }

            where[db.Sequelize.Op.and] = [
                {
                    [db.Sequelize.Op.or]: searchConditions,
                },
            ];
        }

        if (product) {
            if (!where[db.Sequelize.Op.and]) {
                where[db.Sequelize.Op.and] = [];
            }

            where[db.Sequelize.Op.and].push({
                product: product, // exact match
            });
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
                                attributes: ["user_email"],
                            },
                        ],
                    },
                ],
                attributes: {
                    include: [
                        [
                            db.Sequelize.literal(`
            EXISTS (
              SELECT 1 
              FROM broker_commission_histories AS bch
              WHERE 
                bch.target_customer_log_id = referral_logs.id
                AND bch.is_send_bonus = true
                AND bch.is_payment_done = true
                AND bch.is_deleted = false
            )
          `),
                            "commission_devided",
                        ],
                    ],
                },
            });

        // ✅ format response
        const formattedData = rows.map((log) => ({
            id: log.id,
            type: log.type,

            // 👤 referrer
            from_customer_name: log.fromCustomer?.customer_name || null,
            from_customer_email: log.fromCustomer?.customer_email || null,

            // 👤 investor
            to_customer_name: log.toCustomer?.customer_name || null,
            to_customer_email: log.toCustomer?.customer_email || null,

            // 🧑‍💼 broker
            broker_name: log.broker?.user?.display_name || null,
            broker_email: log.broker?.user?.user_email || null,

            // 💰 data
            investment_amount: log.investment_amount,
            commission_amount: log.commission_amount,
            product: log.product,
            status: log.status,

            // 📦 extra
            tracking_number: log.tracking_number,
            tracking_link: log.tracking_link,
            remark: log.remark,
            address: log.address,
            b2bName: log.b2bName,

            commission_devided: log.get("commission_devided") ? true : false,

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
        console.error("getAllReferralLogs error:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = GetAllReferralLogs;