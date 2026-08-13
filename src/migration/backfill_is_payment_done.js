const db = require("../models");
const { resolveOrderPaymentDone } = require("../utils/orderPaymentDoneResolver");

// One-off backfill: recompute is_payment_done for existing landing_page/my_store/api
// SELLER rows using the same EU/non-EU + payment method/option rule captureOrder.js
// now applies at capture time. Safe to re-run — only ever flips false/null -> true,
// never touches a row that is already true (so admin-confirmed payments via
// updateBrokerPaymentStatus.js, and anything already correct, are never overwritten).
// Non-seller (parent broker) rows are never touched — the rule always resolves them
// to false anyway, and any true value there can only have come from an explicit
// admin confirmation, which must be preserved.

const STANDARD_STORE_ORDER_TYPES = ["landing_page", "my_store", "api"];

async function backfillIsPaymentDone() {
  try {
    const rows = await db.BrokerCommissionHistory.findAll({
      where: {
        is_seller: true,
        order_type: STANDARD_STORE_ORDER_TYPES,
        [db.Sequelize.Op.or]: [{ is_payment_done: false }, { is_payment_done: null }],
      },
      attributes: ["id", "order_id", "order_type", "selected_payment_method", "choose_payment_option"],
      raw: true,
    });

    console.log(`[BackfillIsPaymentDone] Found ${rows.length} seller row(s) to evaluate.`);

    // Cache EU lookups per (order_type, order_id) so orders with multiple rows
    // (shouldn't normally happen for these order types, but just in case) only
    // hit the shipping/country tables once each.
    const euCache = new Map();

    const resolveIsEU = async (orderType, orderId) => {
      const cacheKey = `${orderType}:${orderId}`;
      if (euCache.has(cacheKey)) return euCache.get(cacheKey);

      const shippingCountryRow = orderType === "landing_page"
        ? await db.LpOrderShippingOptions.findOne({ where: { lp_order_id: orderId, meta_key: "s_country" } })
        : await db.MyStoreOrderShippingOptions.findOne({ where: { my_store_order_id: orderId, meta_key: "s_country" } });

      let isEU = false;
      if (shippingCountryRow) {
        const euCountryMatch = await db.TaxCountry.findOne({ where: { Country_name: shippingCountryRow.meta_value } });
        isEU = !!euCountryMatch;
      }

      euCache.set(cacheKey, isEU);
      return isEU;
    };

    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const isEU = await resolveIsEU(row.order_type, row.order_id);
      const shouldBePaidDone = resolveOrderPaymentDone(
        row.selected_payment_method,
        row.choose_payment_option,
        true, // these are all seller rows by the query above
        isEU
      );

      if (shouldBePaidDone) {
        await db.BrokerCommissionHistory.update(
          { is_payment_done: true },
          { where: { id: row.id } }
        );
        updatedCount++;
        console.log(`[BackfillIsPaymentDone] Row ${row.id} (order ${row.order_id}, ${row.order_type}, method ${row.selected_payment_method}, option ${row.choose_payment_option}, isEU ${isEU}) -> is_payment_done = true`);
      } else {
        skippedCount++;
      }
    }

    console.log(`[BackfillIsPaymentDone] Done. Updated: ${updatedCount}, left unchanged: ${skippedCount}, total evaluated: ${rows.length}.`);
  } catch (error) {
    console.error("[BackfillIsPaymentDone] Error:", error);
    throw error;
  }
}

module.exports = backfillIsPaymentDone;
