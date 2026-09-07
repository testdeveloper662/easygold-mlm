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

    // captureOrder.js computes is_payment_done correctly at capture time
    // (EU/non-EU + payment method/option for seller rows, always-true for the
    // admin-exempt order types, admin-confirmed for everything else) — so it's
    // the single source of truth here: only count records that are paid out.
    // (Existing historical rows were backfilled via
    // src/migration/backfill_is_payment_done.js before this filter went live.)
    const commissionRows = await db.BrokerCommissionHistory.findAll({
        where: {
            user_id: userId,
            is_deleted: false,
            is_payment_done: true,
        },
        attributes: ["commission_amount", "order_type", "is_seller", "selected_payment_method", "choose_payment_option"],
        raw: true,
    });

    if (!commissionRows.length) return totals;

    const B2B_TYPES = [
        "my_store",
        "api",
        "landing_page",
        "gold_purchase",
        "gold_purchase_sell_orders",
        "goldprice_fixing",
        "dealer_purchasing",
        "dealer_purchasing_diamond"
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
            const isGoldLikeType = ["goldprice_fixing", "dealer_purchasing", "dealer_purchasing_diamond", "gold_purchase", "gold_purchase_sell_orders"].includes(orderType);
            const method = Number(row.selected_payment_method);
            const option = Number(row.choose_payment_option);
            // Crypto(2)/FLIZPay(5) with option 1 or 2, OR option 4 with any method:
            // Admin pays this seller's Level 1 too, so it counts toward the wallet total.
            const walletEligibleSeller = ([2, 5].includes(method) && [1, 2].includes(option)) || option === 4;

            if (row.is_seller && !isGoldLikeType && !walletEligibleSeller) return; // skip seller B2B rows that don't qualify
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
