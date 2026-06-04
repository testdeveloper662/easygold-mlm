const db = require("../../models");
const { generateImageUrl } = require("../../utils/Helper");

const GetBrokerPayoutRequests = async (req, res) => {
    try {
        const { user } = req.user;

        let broker_id;

        if (user.role === "SUPER_ADMIN" && req.query.viewUserId) {
            const broker = await db.Brokers.findOne({
                where: { user_id: parseInt(req.query.viewUserId) },
                attributes: ["id"],
            });
            if (!broker) {
                return res.status(404).json({
                    success: false,
                    message: "Broker not found",
                });
            }
            broker_id = broker.id;
        } else {
            broker_id = user.broker_id;
        }

        if (!broker_id) {
            return res.status(400).json({
                success: false,
                message: "broker_id is required.",
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const totalCount = await db.BrokerPayoutRequests.count({
            where: { broker_id },
        });

        const payoutList = await db.BrokerPayoutRequests.findAll({
            where: { broker_id },
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        const formattedData = await Promise.all(
            payoutList.map(async (item) => {
                const json = item.toJSON();
                const invoice_url = json.invoice
                    ? await generateImageUrl(json.invoice, "invoice")
                    : "";
                return {
                    id: json.id,
                    broker_id: json.broker_id,
                    amount: json.amount,
                    invoice: invoice_url,
                    payout_for: json.payout_for,
                    status: json.status,
                    created_at: json.createdAt,
                    updated_at: json.updatedAt,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Payout requests fetched successfully.",
            data: formattedData,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                totalItems: totalCount,
                itemsPerPage: limit,
            },
        });
    } catch (error) {
        console.error("Error fetching broker payout requests:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = GetBrokerPayoutRequests;
