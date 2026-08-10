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

        let payoutRequest = await db.BrokerPayoutRequests.findOne({
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

        if (!payoutRequest && db.AffiliatePayoutRequests) {
            payoutRequest = await db.AffiliatePayoutRequests.findOne({
                where: { id },
                include: [
                    {
                        model: db.Affiliates,
                        as: "affiliate",
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
                                        where: { meta_key: ["language"] },
                                        required: false,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
            if (payoutRequest) {
                payoutRequest.broker = payoutRequest.affiliate;
            }
        }

        if (!payoutRequest) {
            return res.status(404).json({
                success: false,
                message: "Payout request not found",
            });
        }

        // APPROVED and REJECTED status actions cannot be reverted
        if (payoutRequest.status === "APPROVED" || payoutRequest.status === "REJECTED") {
            return res.status(400).json({
                success: false,
                message: `Payout request is already ${payoutRequest.status.toLowerCase()} and cannot be modified or reverted.`,
            });
        }

        const allowedStatus = ["PENDING", "APPROVED", "REJECTED"];
        if (status && !allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${allowedStatus.join(", ")}`,
            });
        }

        const { rejection_reason } = req.body;

        if (status === "REJECTED" && (!rejection_reason || !rejection_reason.trim())) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required when rejecting a payout request.",
            });
        }

        // Update fields
        if (status) payoutRequest.status = status;
        if (amount) payoutRequest.amount = amount;
        if (status === "REJECTED" && rejection_reason) {
            payoutRequest.rejection_reason = rejection_reason.trim();
        }

        await payoutRequest.save();

        if (status === "APPROVED" || status === "REJECTED") {
            let userDetails = payoutRequest?.broker?.user || payoutRequest?.affiliate?.user;

            if (!userDetails) {
                const targetId = payoutRequest?.broker_id || payoutRequest?.affiliate_id;
                if (targetId) {
                    let b = await db.Brokers.findOne({
                        where: { id: targetId },
                        include: [{
                            model: db.Users,
                            as: "user",
                            attributes: ["ID", "user_email"],
                            include: [{ model: db.UsersMeta, as: "user_meta", attributes: ["meta_key", "meta_value"], required: false }]
                        }]
                    });

                    if (!b && db.Affiliates) {
                        b = await db.Affiliates.findOne({
                            where: { id: targetId },
                            include: [{
                                model: db.Users,
                                as: "user",
                                attributes: ["ID", "user_email"],
                                include: [{ model: db.UsersMeta, as: "user_meta", attributes: ["meta_key", "meta_value"], required: false }]
                            }]
                        });
                    }

                    if (b?.user) {
                        userDetails = b.user.get ? b.user.get({ plain: true }) : b.user;
                    }
                }
            }

            const userMeta = userDetails?.user_meta || [];
            const language = userMeta.find(m => m.meta_key === "language")?.meta_value || "en";
            const recipientEmail = userDetails?.user_email;

            const isAffiliate = !!payoutRequest?.affiliate_id;
            const userRoleText = isAffiliate ? "Affiliate" : "Broker";

            const reqDateObj = payoutRequest?.createdAt ? new Date(payoutRequest.createdAt) : new Date();
            const reqDateFormatted =
                String(reqDateObj.getDate()).padStart(2, "0") + "/" +
                String(reqDateObj.getMonth() + 1).padStart(2, "0") + "/" +
                reqDateObj.getFullYear();

            const nowDateObj = new Date();
            const currentDateFormatted =
                String(nowDateObj.getDate()).padStart(2, "0") + "/" +
                String(nowDateObj.getMonth() + 1).padStart(2, "0") + "/" +
                nowDateObj.getFullYear();

            const formattedAmount = `€${parseFloat(payoutRequest.amount || amount || 0).toFixed(2)}`;

            const templateVariables = {
                broker_or_affiliate: userRoleText,
                Broker_or_Affiliate: userRoleText,
                amount: formattedAmount,
                request_date: reqDateFormatted,
                approval_date: currentDateFormatted,
                rejection_date: currentDateFormatted,
                rejection_reason: (status === "REJECTED" && rejection_reason ? rejection_reason.trim() : payoutRequest.rejection_reason) || "-",
                invoice_number: id,
            };

            const templateId = status === "APPROVED" ? 138 : 139;

            const emailData = await getRenderedEmail(
                templateId,
                language,
                templateVariables
            );

            if (recipientEmail) {
                console.log(`[UpdateBrokerPayoutRequest] Sending email (Template ${templateId}, lang: ${language}) to: ${recipientEmail}`);
                await SendEmailHelper(
                    emailData.subject,
                    emailData.htmlContent,
                    recipientEmail
                );
            } else {
                console.warn(`[UpdateBrokerPayoutRequest] No user email found for payout request ID: ${id}`);
            }
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
