const db = require("../models");
const { resolveOrderPaymentDone } = require("../utils/orderPaymentDoneResolver");

// One-off backfill: recompute is_payment_done for existing landing_page/my_store/api
// SELLER rows using the same EU/non-EU + vat_id + payment method/option rule
// captureOrder.js now applies at capture time.
//
// Part 1 (auto-applied, safe): flips false/null -> true for rows that now qualify.
// Never touches a row that is already true, so admin-confirmed payments via
// updateBrokerPaymentStatus.js are never overwritten.
//
// Part 2 (report only, no writes): lists rows that are currently true, EU, and
// now have a vat_id on file — under the current rule these should be false, but
// they may equally be a legitimate admin confirmation made independently of this
// auto-rule. There's no reliable way to tell those apart (no separate "confirmed
// by admin" flag, and updatedAt timestamps are scattered across many months, not
// clustered to one backfill run), so these are only printed for manual review —
// never auto-reverted.
//
// Non-seller (parent broker) rows are never touched — the rule always resolves
// them to false anyway, and any true value there can only have come from an
// explicit admin confirmation, which must be preserved.

const STANDARD_STORE_ORDER_TYPES = ["landing_page", "my_store", "api"];

async function resolveOrderEUAndVatId(orderType, orderId, cache) {
  const cacheKey = `${orderType}:${orderId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const ShippingOptionsModel = orderType === "landing_page" ? db.LpOrderShippingOptions : db.MyStoreOrderShippingOptions;
  const shippingIdField = orderType === "landing_page" ? "lp_order_id" : "my_store_order_id";

  const shippingCountryRow = await ShippingOptionsModel.findOne({ where: { [shippingIdField]: orderId, meta_key: "s_country" } });
  let isEU = false;
  if (shippingCountryRow) {
    const euCountryMatch = await db.TaxCountry.findOne({ where: { Country_name: shippingCountryRow.meta_value } });
    isEU = !!euCountryMatch;
  }

  const vatIdRow = await ShippingOptionsModel.findOne({ where: { [shippingIdField]: orderId, meta_key: "vat_id" } });
  const hasVatId = !!(vatIdRow && String(vatIdRow.meta_value || "").trim());

  const result = { isEU, hasVatId };
  cache.set(cacheKey, result);
  return result;
}

async function backfillIsPaymentDone() {
  try {
    const cache = new Map();

    // ---------- Part 1: false/null -> true where the rule now says true ----------
    const falseRows = await db.BrokerCommissionHistory.findAll({
      where: {
        is_seller: true,
        order_type: STANDARD_STORE_ORDER_TYPES,
        [db.Sequelize.Op.or]: [{ is_payment_done: false }, { is_payment_done: null }],
      },
      attributes: ["id", "order_id", "order_type", "selected_payment_method", "choose_payment_option"],
      raw: true,
    });

    console.log(`[BackfillIsPaymentDone] Part 1: found ${falseRows.length} false/null seller row(s) to evaluate.`);

    let updatedCount = 0;
    for (const row of falseRows) {
      const { isEU, hasVatId } = await resolveOrderEUAndVatId(row.order_type, row.order_id, cache);
      const shouldBePaidDone = resolveOrderPaymentDone(
        row.selected_payment_method,
        row.choose_payment_option,
        true,
        isEU,
        hasVatId
      );

      if (shouldBePaidDone) {
        await db.BrokerCommissionHistory.update(
          { is_payment_done: true },
          { where: { id: row.id } }
        );
        updatedCount++;
        console.log(`[BackfillIsPaymentDone] Row ${row.id} (order ${row.order_id}, ${row.order_type}, method ${row.selected_payment_method}, option ${row.choose_payment_option}, isEU ${isEU}, hasVatId ${hasVatId}) -> is_payment_done = true`);
      }
    }

    console.log(`[BackfillIsPaymentDone] Part 1 done. Updated: ${updatedCount}, left unchanged: ${falseRows.length - updatedCount}, total evaluated: ${falseRows.length}.`);

    // ---------- Part 2: report-only, currently true + EU + vat_id present ----------
    const trueRows = await db.BrokerCommissionHistory.findAll({
      where: {
        is_seller: true,
        order_type: STANDARD_STORE_ORDER_TYPES,
        is_payment_done: true,
      },
      attributes: ["id", "order_id", "order_type", "selected_payment_method", "choose_payment_option", "updatedAt"],
      raw: true,
    });

    console.log(`[BackfillIsPaymentDone] Part 2: checking ${trueRows.length} currently-true seller row(s) for EU + vat_id mismatches...`);

    const flaggedForReview = [];
    for (const row of trueRows) {
      const { isEU, hasVatId } = await resolveOrderEUAndVatId(row.order_type, row.order_id, cache);
      if (isEU && hasVatId) {
        flaggedForReview.push({ ...row, isEU, hasVatId });
      }
    }

    if (flaggedForReview.length === 0) {
      console.log("[BackfillIsPaymentDone] Part 2: no EU + vat_id rows found among currently-true rows — nothing to review.");
    } else {
      console.log(`[BackfillIsPaymentDone] Part 2: ${flaggedForReview.length} row(s) are currently true, EU, and now have a vat_id on file. NOT auto-changed — review manually:`);
      console.log(JSON.stringify(flaggedForReview, null, 2));
    }

    return { updatedCount, flaggedForReview };
  } catch (error) {
    console.error("[BackfillIsPaymentDone] Error:", error);
    throw error;
  }
}

module.exports = backfillIsPaymentDone;

// Allows running this file directly: node src/migration/backfill_is_payment_done.js
if (require.main === module) {
  backfillIsPaymentDone()
    .then(() => {
      console.log("[BackfillIsPaymentDone] Script complete.");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    })
    .finally(() => {
      db.sequelize.close();
    });
}
