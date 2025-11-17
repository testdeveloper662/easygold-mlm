const db = require("../../models");

const UpdateBrokerPayoutRequest = async (req, res) => {
    try {
        const { id } = req.query; // payout request ID
        const { status, amount } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Payout request id is required",
            });
        }

        const payoutRequest = await db.BrokerPayoutRequests.findOne({
            where: { id },
        });

        if (!payoutRequest) {
            return res.status(404).json({
                success: false,
                message: "Payout request not found",
            });
        }

        const allowedStatus = ["PENDING", "APPROVED", "REJECTED"];
        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${allowedStatus.join(", ")}`,
            });
        }

        // Update fields
        if (status) payoutRequest.status = status;
        if (amount) payoutRequest.amount = amount;

        await payoutRequest.save();

        return res.status(200).json({
            success: true,
            message: "Payout request updated successfully.",
            data: payoutRequest,
        });
    } catch (error) {
        console.error("Error updating payout request:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = UpdateBrokerPayoutRequest;
