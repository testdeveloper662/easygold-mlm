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
                // 👉 Seller Logic
                {
                    is_seller: true,
                    [Op.or]: [
                        {
                            selected_payment_method: [1, 2, 3, 4, 5],
                            choose_payment_option: [1, 2, 3, 4],
                            is_payment_declined: false,
                            order_type: {
                                [Op.notIn]: [
                                    "gold_purchase_sell_orders",
                                    "gold_purchase",
                                    "goldprice_fixing",
                                    "dealer_purchasing",
                                    "dealer_purchasing_diamond",
                                    "goldflex",
                                    "easygoldtoken",
                                    "primeinvest",
                                ],
                            },
                        },
                        {
                            order_type: {
                                [Op.in]: [
                                    "gold_purchase_sell_orders",
                                    "gold_purchase",
                                    "goldprice_fixing",
                                    "dealer_purchasing",
                                    "dealer_purchasing_diamond",
                                    "goldflex",
                                    "easygoldtoken",
                                    "primeinvest",
                                ],
                            },
                            is_payment_done: true,
                        }
                    ],
                },

                // 👉 Non-Seller Logic
                {
                    is_seller: false,
                    [Op.or]: [
                        {
                            is_payment_done: true,
                        },
                    ],
                },
            ],
        },
        attributes: ["commission_amount", "order_type", "is_seller", "selected_payment_method"],
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
            if (row.is_seller && orderType !== "goldprice_fixing" && orderType !== "dealer_purchasing" && orderType !== "dealer_purchasing_diamond" && orderType !== "gold_purchase" && orderType !== "gold_purchase_sell_orders" && row.selected_payment_method !== 2) return; // skip seller B2B
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
