const db = require("../../models");
const { Op } = require("sequelize");
const { generateImageUrl } = require("../../utils/Helper");

const GetBrokerPayoutRequests = async (req, res) => {
    try {
        // Optional filters
        const { broker_id, email, type, user_id } = req.query;

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Build where clause dynamically
        const whereClause = {};
        if (broker_id) {
            whereClause[Op.or] = [
                { broker_id: broker_id },
                { user_id: broker_id }
            ];
        }
        if (user_id) whereClause.user_id = user_id;

        // Build include clause for broker and user
        const brokerInclude = {
            model: db.Brokers,
            as: "broker",
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "user_nicename", "user_login", "user_email"],
                },
            ],
            required: false,
        };

        const userInclude = {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_nicename", "user_login", "user_email"],
            required: false,
        };

        // Add email filter to user include if email is provided
        if (email) {
            const emailWhere = {
                [Op.or]: [
                    { user_login: email },
                    { user_email: email },
                ],
            };
            userInclude.where = emailWhere;
            userInclude.required = true;
        }


        const countOptions = {
            where: whereClause,
            include: [userInclude]
        };
        const totalCount = await db.BrokerPayoutRequests.count(countOptions);

        // Fetch data
        const payoutList = await db.BrokerPayoutRequests.findAll({
            where: whereClause,
            include: [brokerInclude, userInclude],
            order: [["createdAt", "DESC"]],
            limit: limit,
            offset: offset,
        });

        // FIXED: Use Promise.all()
        const formattedData = await Promise.all(
            payoutList.map(async (item) => {
                const json = item.toJSON();
                const invoice_url = json.invoice ? await generateImageUrl(json.invoice, "invoice") : "";

                // Fallback to json.user directly for non-brokers, or broker.user for backward compatibility
                const u = json.user || (json.broker && json.broker.user) || null;

                return {
                    id: json.id,
                    broker_id: json.broker_id,
                    user_id: json.user_id,
                    amount: json.amount,
                    invoice: invoice_url,
                    payout_for: json.payout_for,
                    status: json.status,
                    created_at: json.createdAt,
                    updated_at: json.updatedAt,

                    broker: {
                        id: json.broker ? json.broker.id : null,
                        referral_code: json.broker ? json.broker.referral_code : "",
                        children_count: json.broker ? json.broker.children_count : 0,
                        total_commission_amount: json.broker ? json.broker.total_commission_amount : 0,
                        user: u ? {
                            id: u.ID,
                            username: u.user_login,
                            name: u.user_nicename,
                        } : null,
                    },
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Broker payout requests fetched successfully.",
            data: formattedData,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalItems: totalCount,
                itemsPerPage: limit,
            },
        });
    } catch (error) {
        console.error("Error fetching payout requests:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = GetBrokerPayoutRequests;
