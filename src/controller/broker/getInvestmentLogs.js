const { Op } = require("sequelize");
const db = require("../../models");

const GetInvestmentLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            product,
            status
        } = req.query;

        const { user } = req.user;

        const broker_id = user.broker_id

        const offset = (page - 1) * limit;

        const where = {
            type: {
                [Op.in]: [
                    "INVESTMENT_DONE",
                    "COMMISSION_APPROVED",
                    "COMMISSION_REJECTED"
                ],
            },
        };

        // ✅ filters
        if (product) where.product = product;
        if (status) where.status = status;
        if (broker_id) {
            where.broker_id = broker_id;

            where.status = "APPROVED";

            // 🔥 APPLY ONLY WHEN broker_id EXISTS
            where[Op.and] = [
                db.Sequelize.literal(`
            EXISTS (
                SELECT 1
                FROM broker_commission_histories AS bch
                WHERE 
                    bch.target_customer_log_id = referral_logs.id
                    AND bch.is_send_bonus = true
                    AND bch.is_payment_done = true
                    AND bch.is_deleted = false
                    AND bch.broker_id = ${broker_id}
            )
        `),
            ];
        }

        // 🔥 SEARCH LOGIC
        if (search) {
            where[db.Sequelize.Op.or] = [
                { id: search },

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

                // 👤 to customer (investor)
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

                // 🧑‍💼 broker email
                {
                    "$broker.user.user_email$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },

                // 🧑‍💼 broker name
                {
                    "$broker.user.display_name$": {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },

                // 📦 product
                {
                    product: {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
                },

                // ⚙️ status
                {
                    status: {
                        [db.Sequelize.Op.like]: `%${search}%`,
                    },
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
                            "commission_devided"
                        ]
                    ]
                },
            });

        const formattedData = rows.map((log) => ({
            id: log.id,

            // 👤 Referrer
            from_customer_name: log.fromCustomer?.customer_name || null,
            from_customer_email: log.fromCustomer?.customer_email || null,

            // 👤 Investor (TO customer)
            to_customer_name: log.toCustomer?.customer_name || null,
            to_customer_email: log.toCustomer?.customer_email || null,

            broker_name: log.broker?.user?.display_name || null,
            broker_email: log.broker?.user?.user_email || null,

            // 💰 Data
            investment_amount: log.investment_amount,
            commission_amount: log.commission_amount,
            product: log.product,
            type: log.type,
            status: log.status,

            tracking_number: log.tracking_number || "",
            tracking_link: log.tracking_link || "",
            remark: log.remark || "",
            address: log.address,
            b2bName: log.b2bName,

            commission_devided: log.get("commission_devided") ? true : false,

            createdAt: log.createdAt,
        }));

        return res.json({
            success: true,
            data: formattedData,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
            },
        });
    } catch (err) {
        console.error("getInvestmentLogs error:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = GetInvestmentLogs;