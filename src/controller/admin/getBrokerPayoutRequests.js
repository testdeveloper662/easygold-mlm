const db = require("../../models");
const { Op } = require("sequelize");

const GetBrokerPayoutRequests = async (req, res) => {
    try {
        // Optional filter
        const { broker_id } = req.query;

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Build where clause dynamically
        const whereClause = {};
        if (broker_id) whereClause.broker_id = broker_id;

        // Count total rows
        const totalCount = await db.BrokerPayoutRequests.count({
            where: whereClause,
        });

        // Fetch data
        const payoutList = await db.BrokerPayoutRequests.findAll({
            where: whereClause,
            include: [
                {
                    model: db.Brokers,
                    as: "broker",
                    include: [
                        {
                            model: db.Users,
                            as: "user",
                            attributes: ["ID", "user_nicename", "user_login"],
                        },
                    ],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: limit,
            offset: offset,
        });

        const formattedData = payoutList.map((item) => {
            const json = item.toJSON();

            return {
                id: json.id,
                broker_id: json.broker_id,
                amount: json.amount,
                payout_for: json.payout_for,
                status: json.status,
                created_at: json.createdAt,
                updated_at: json.updatedAt,

                broker: json.broker
                    ? {
                        id: json.broker.id,
                        referral_code: json.broker.referral_code,
                        children_count: json.broker.children_count,
                        total_commission_amount: json.broker.total_commission_amount,

                        user: json.broker.user
                            ? {
                                id: json.broker.user.ID,
                                username: json.broker.user.user_login,
                                name: json.broker.user.user_nicename,
                            }
                            : null,
                    }
                    : null,
            };
        });

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
