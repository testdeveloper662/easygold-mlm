const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

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
            include: [
                {
                    model: db.Brokers,
                    as: "broker",
                    attributes: ["id"],
                    include: [
                        {
                            model: db.Users,
                            as: "user",
                            attributes: ["ID", "user_email"],
                            include: [
                                {
                                    model: db.UsersMeta,
                                    as: "user_meta",
                                    attributes: ["meta_key", "meta_value"],
                                    where: {
                                        meta_key: [
                                            "language"
                                        ],
                                    },
                                    required: false, // allow missing meta values
                                },
                            ],
                        },
                    ],
                },
            ],
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

        const templateVariables = {
            invoice_number: id
        }
        if (status === "APPROVED" || status === "REJECTED") {
            const userDetails = payoutRequest?.broker?.user;
            const userMeta = userDetails?.user_meta || [];
            const language = userMeta.find(m => m.meta_key === "language")?.meta_value || "en";

            const templateId = status === "APPROVED" ? 85 : 86;

            const emailData = await getRenderedEmail(
                templateId,
                language,
                templateVariables
            );

            await SendEmailHelper(
                emailData.subject,
                emailData.htmlContent,
                userDetails?.user_email
            );
        }

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
