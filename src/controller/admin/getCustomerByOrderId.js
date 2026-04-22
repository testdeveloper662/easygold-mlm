const db = require("../../models");

const BrokerCommissionHistory = db.BrokerCommissionHistory;
const TargetCustomerReferralLogs = db.TargetCustomerReferralLogs;
const TargetCustomers = db.TargetCustomers;

const GetCustomerByOrderId = async (req, res) => {
    try {
        const { order_id } = req.query;

        if (!order_id) {
            return res.status(400).json({
                success: false,
                message: "order_id is required",
            });
        }

        // ✅ Main record (with referral log)
        const data = await db.BrokerCommissionHistory.findOne({
            where: { order_id },
            include: [
                {
                    model: db.TargetCustomerReferralLogs,
                    as: "referralLog",
                    include: [
                        {
                            model: db.TargetCustomers,
                            as: "fromCustomer",
                            attributes: ["id", "customer_name", "customer_email", "telephone"],
                        },
                        {
                            model: db.TargetCustomers,
                            as: "toCustomer",
                            attributes: ["id", "customer_name", "customer_email", "telephone"],
                        },
                    ],
                },
            ],
        });

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "No record found",
            });
        }

        // ✅ Get ALL broker commissions for same order
        const allCommissions = await db.BrokerCommissionHistory.findAll({
            where: { order_id },
            include: [
                {
                    model: db.Users,
                    as: "commission_from_user",
                    attributes: ["user_email"],
                },
            ],
        });

        // ✅ Format commissions
        const broker_commissions = allCommissions.map((item) => ({
            broker_id: item.broker_id,
            user_id: item.user_id,
            user_email: item.commission_from_user?.user_email || null,
            commission_percent: item.commission_percent,
            commission_amount: item.commission_amount,
            is_seller: item.is_seller,
            is_payment_done: item.is_payment_done,
            is_payment_declined: item.is_payment_declined,
            tree: item.tree,
        }));

        // ✅ Final response format
        const response = {
            order_id: data.order_id,
            order_type: data.order_type,
            order_amount: data.order_amount,
            profit_amount: data.profit_amount,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            tree: data.tree,
            payment_type:
                data.selected_payment_method === 1
                    ? "Bank Transfer"
                    : data.selected_payment_method === 2
                        ? "Crypto"
                        : "Unknown",

            broker_commissions,
            referralLog: data.referralLog,
        };

        return res.status(200).json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};

module.exports = GetCustomerByOrderId;