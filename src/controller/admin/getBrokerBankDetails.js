const db = require("../../models");

const GetBrokerBankDetails = async (req, res) => {
    try {
        const { brokerId } = req.params;

        if (!brokerId) {
            return res.status(400).json({
                success: false,
                message: "Broker ID is required.",
            });
        }

        const broker_id = parseInt(brokerId, 10);
        if (isNaN(broker_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid broker ID.",
            });
        }

        const brokerDetails = await db.Brokers.findOne({
            where: { id: broker_id },
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "user_nicename", "user_login", "user_email", "display_name"],
                },
            ],
        });

        if (!brokerDetails) {
            return res.status(404).json({
                success: false,
                message: "Broker not found.",
            });
        }

        const bankDetails = await db.BrokerBankDetails.findOne({
            where: { broker_id: broker_id },
        });

        if (!bankDetails) {
            return res.status(404).json({
                success: false,
                message: "Bank details not found for this broker.",
                data: {
                    broker: {
                        id: brokerDetails.id,
                        user_id: brokerDetails.user_id,
                        email: brokerDetails.user?.user_email,
                        name: brokerDetails.user?.display_name || brokerDetails.user?.user_nicename,
                    }
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                ...bankDetails.dataValues,
                broker: {
                    id: brokerDetails.id,
                    user_id: brokerDetails.user_id,
                    email: brokerDetails.user?.user_email,
                    name: brokerDetails.user?.display_name || brokerDetails.user?.user_nicename,
                }
            }
        });
    } catch (error) {
        console.error("Error in GetBrokerBankDetails (Admin):", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = GetBrokerBankDetails;

