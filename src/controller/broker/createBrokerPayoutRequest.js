const db = require("../../models");

const CreateBrokerPayoutRequest = async (req, res) => {
    try {
        const user = req?.user?.user;
        const broker_id = user?.broker_id;
        console.log("user=11111111111 ", broker_id);


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

        const { amount, payout_for } = req.body;

        if (!amount || !payout_for) {
            return res.status(400).json({
                success: false,
                message: "broker_id, amount and payout_for are required",
            });
        }

        const validEnums = ["EASYGOLD_TOKEN", "PRIMEINVEST", "GOLDFLEX", "B2B_DASHBOARD"];
        if (!validEnums.includes(payout_for)) {
            return res.status(400).json({
                success: false,
                message: `payout_for must be one of: ${validEnums.join(", ")}`,
            });
        }

        // Create new payout request
        const newRequest = await db.BrokerPayoutRequests.create({
            broker_id,
            amount,
            payout_for,
            status: "PENDING",
        });

        return res.status(200).json({
            success: true,
            message: "Payout request created successfully.",
            data: newRequest,
        });
    } catch (error) {
        console.error("Error creating payout request:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = CreateBrokerPayoutRequest;
