const db = require("../../models");

const GetBrokerBankDetails = async (req, res) => {
    try {
        const user = req?.user?.user;
        const broker_id = user?.broker_id;
        console.log("==========user = ", user);

        if (!broker_id) {
            return res.status(400).json({
                success: false,
                message: "broker_id is required.",
            });
        }
        const brokerDetails = await db.Brokers.findOne({
            where: { id: broker_id },
        });

        if (!brokerDetails) {
            return res.status(404).json({
                success: false,
                message: "Broker not found.",
            });
        }


        const bankDetails = await db.BrokerBankDetails.findOne({
            where: { broker_id },
        });

        return res.status(200).json({
            success: true,
            data: bankDetails || {},
        });
    } catch (error) {
        console.error("Error in GetBrokerBankDetails:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = GetBrokerBankDetails;
