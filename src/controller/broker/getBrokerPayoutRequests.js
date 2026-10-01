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
            }) || (db.Affiliates ? await db.Affiliates.findOne({
                where: { user_id: parseInt(req.query.viewUserId) },
                attributes: ["id"],
            }) : null);
            if (!broker) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            broker_id = broker.id;
        } else {
            broker_id = user.broker_id || user.affiliate_id;
            if (!broker_id && user.ID) {
                const b = await db.Brokers.findOne({ where: { user_id: user.ID }, attributes: ["id"] })
                       || (db.Affiliates ? await db.Affiliates.findOne({ where: { user_id: user.ID }, attributes: ["id"] }) : null);
                if (b) broker_id = b.id;
            }
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

        const type = req.query.type;
        
        if (type && user.role !== "SUPER_ADMIN") {
            const normalizedRole = (user.role || "").toLowerCase();
            if (normalizedRole !== type.toLowerCase()) {
                return res.status(200).json({
                    success: true,
                    message: "Payout requests fetched successfully.",
                    data: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limit,
                    },
                });
            }
        }
        let totalCount = 0;
        let payoutList = [];

        const whereCondition = user.ID 
            ? { [db.Sequelize.Op.or]: [{ broker_id }, { user_id: user.ID }] }
            : { broker_id };
        
        totalCount = await db.BrokerPayoutRequests.count({
            where: whereCondition,
        });
        payoutList = await db.BrokerPayoutRequests.findAll({
            where: whereCondition,
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
                    user_id: json.user_id,
                    amount: json.amount,
                    invoice: invoice_url,
                    payout_for: json.payout_for,
                    status: json.status,
                    rejection_reason: json.rejection_reason || null,
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
