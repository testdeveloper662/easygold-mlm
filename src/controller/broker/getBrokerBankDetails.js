const db = require("../../models");
const { getBrokerCommissionTotals } = require("../../utils/getBrokerCommissionTotals");

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
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "user_nicename", "user_login"],
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
            where: { broker_id },
        });

        const commissionTotals = await getBrokerCommissionTotals(brokerDetails);
        const approvedPayouts = await db.BrokerPayoutRequests.findAll({
            where: {
                broker_id,
                status: "APPROVED"
            },
            attributes: [
                "payout_for",
                [db.Sequelize.fn("SUM", db.Sequelize.col("amount")), "total_amount"]
            ],
            group: ["payout_for"],
            raw: true
        });

        // Convert array → object (easy mapping)
        const payoutDeductMap = {
            EASYGOLD_TOKEN: 0,
            PRIMEINVEST: 0,
            GOLDFLEX: 0,
            B2B_DASHBOARD: 0
        };

        approvedPayouts.forEach(p => {
            payoutDeductMap[p.payout_for] = Number(p.total_amount || 0);
        });

        // -------------------------------------
        // 🔹 Subtract per-wallet
        // -------------------------------------
        const finalTotals = {
            EASYGOLD_TOKEN: commissionTotals.EASYGOLD_TOKEN - payoutDeductMap.EASYGOLD_TOKEN,
            PRIMEINVEST: commissionTotals.PRIMEINVEST - payoutDeductMap.PRIMEINVEST,
            GOLDFLEX: commissionTotals.GOLDFLEX - payoutDeductMap.GOLDFLEX,
            B2B_DASHBOARD: commissionTotals.B2B_DASHBOARD - payoutDeductMap.B2B_DASHBOARD,
        };

        // Prevent negative values
        Object.keys(finalTotals).forEach(key => {
            if (finalTotals[key] < 0) finalTotals[key] = 0;
        });
        return res.status(200).json({
            success: true,
            data: { ...bankDetails.dataValues, commissions_totals: finalTotals } || {}
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
