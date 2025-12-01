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
            [Op.or]: [
                { is_seller: true },
                { [Op.and]: [{ is_seller: false }, { is_payment_done: true }] },
            ],
        },
        attributes: ["commission_amount", "order_type"],
        raw: true,
    });

    if (!commissionRows.length) return totals;

    // Allowed order types for B2B dashboard commissions
    const B2B_TYPES = ["my_store", "api", "landing_page", "gold_purchase", "gold_purchase_sell_orders"];

    commissionRows.forEach((row) => {
        const amount = Number(row.commission_amount || 0);

        if (B2B_TYPES.includes(row.order_type)) {
            totals.B2B_DASHBOARD += amount ? roundToTwoDecimalPlaces(amount) : 0;
            return;
        }
    });

    return totals;
}

module.exports = { getBrokerCommissionTotals };
