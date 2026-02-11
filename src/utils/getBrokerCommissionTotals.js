const { Op } = require("sequelize");
const db = require("../models");
const { roundToTwoDecimalPlaces } = require("./Helper");

async function getBrokerCommissionTotals(broker) {
    const totals = {
        EASYGOLD_TOKEN: 0,
        PRIMEINVEST: 0,
        GOLDFLEX: 0,
        B2B_DASHBOARD: 0,
    };

    if (!broker || !broker.user) return totals;

    const userId = broker.user.ID;

    // Fetch all commission rows for this user
    const commissionRows = await db.BrokerCommissionHistory.findAll({
        where: {
            user_id: userId,
            is_deleted: false,
            [Op.or]: [
                { is_seller: true },
                { [Op.and]: [{ is_seller: false }, { is_payment_done: true }] },
            ],
        },
        attributes: ["commission_amount", "order_type", "is_seller"],
        raw: true,
    });

    if (!commissionRows.length) return totals;

    const B2B_TYPES = [
        "my_store",
        "api",
        "landing_page",
        "gold_purchase",
        "gold_purchase_sell_orders"
    ];

    // 🔹 Map lowercase DB types → wallet keys
    const TYPE_MAPPING = {
        easygoldtoken: "EASYGOLD_TOKEN",
        primeinvest: "PRIMEINVEST",
        goldflex: "GOLDFLEX",
    };

    commissionRows.forEach((row) => {
        const amount = Number(row.commission_amount || 0);
        const orderType = (row.order_type || "").toLowerCase();

        // ✅ Handle B2B commissions
        if (B2B_TYPES.includes(orderType)) {
            if (row.is_seller) return; // skip seller B2B
            totals.B2B_DASHBOARD += roundToTwoDecimalPlaces(amount);
            return;
        }

        // ✅ Handle EASYGOLD / PRIMEINVEST / GOLDFLEX
        const mappedKey = TYPE_MAPPING[orderType];

        if (mappedKey && totals[mappedKey] !== undefined) {
            totals[mappedKey] += roundToTwoDecimalPlaces(amount);
        }
    });

    return totals;
}

module.exports = { getBrokerCommissionTotals };
