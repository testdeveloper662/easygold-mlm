const db = require("../../models");
const { kontorError } = require("../../utils/kontorErrorCodes");

// orderType is now sent directly by Kontor (confirmed) — it already IS our
// internal order_type string, no channel-name translation needed. This just
// maps each one to the commission-percentage table's service_type label;
// anything not listed here (including "subscription" until an admin
// configures a dedicated row) falls back to the default [50,20,15,10,5]
// split, same as every other order type with no DB-configured percentages.
const ORDER_TYPE_TO_SERVICE_TYPE = {
  my_store: "My Store",
  diamond_gemstone: "Diamond & Gemstone",
  goldprice_fixing: "Gold Price Fixation",
  gold_purchase_sell_orders: "Gold Purchase",
  dealer_purchasing: "Dealer Purchasing",
  subscription: "Subscription",
};

const BROKER_LEVELS = 5;
const centsToAmount = (cents) => (cents === undefined || cents === null ? null : Math.round(Number(cents)) / 100);

const CaptureKontorOrder = async (req, res) => {
  try {
    const {
      entry_id,
      broker_id,
      external_ref,
      orderType,
      event,
      occurred_at,
      order = {},
      product = {},
      amounts = {},
      commission = {},
    } = req.body;

    // Accepted from the body (documented contract) or the Idempotency-Key
    // header (also sent per Christian's convention note) — body wins if
    // both are present and differ, since that's the documented field.
    const idempotency_key = req.body.idempotency_key || req.headers["idempotency-key"];

    const { basis_net_cents } = commission;

    if (!idempotency_key || !orderType || (!broker_id && !external_ref) || basis_net_cents === undefined || basis_net_cents === null) {
      return kontorError(
        res,
        400,
        "VALIDATION_ERROR",
        "Missing required fields: idempotency_key, orderType, broker_id (or external_ref), commission.basis_net_cents"
      );
    }

    const base = centsToAmount(basis_net_cents);
    if (!Number.isFinite(base)) {
      return kontorError(res, 400, "VALIDATION_ERROR", "commission.basis_net_cents must be a number");
    }

    // Idempotency: dedupe against Kontor's idempotency_key before booking
    // any commission — a retried push, or a resend of an already-processed
    // event, returns the existing booking instead of double-booking.
    const existing = await db.BrokerCommissionHistory.findOne({
      where: { kontor_idempotency_key: String(idempotency_key), is_seller: true },
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        reference: `MLM-TX-${String(existing.id).padStart(6, "0")}`,
        distribution: [],
      });
    }

    // broker_id is Kontor's primary way of referencing a broker going
    // forward (it's what we return from /broker/register) — external_ref
    // is a fallback. Scoped to source='kontor' as a safety net so a typo'd
    // id can't accidentally book commission against an unrelated broker.
    let broker = null;
    if (broker_id) {
      broker = await db.Brokers.findOne({ where: { id: broker_id, source: "kontor" } });
    }
    if (!broker && external_ref) {
      broker = await db.Brokers.findOne({
        where: { source: "kontor", external_ref: String(external_ref) },
      });
    }
    if (!broker) {
      return kontorError(res, 404, "NOT_FOUND", "No Kontor-sourced broker found for this broker_id/external_ref");
    }

    // Walk the broker chain upward, same traversal the existing commission
    // engine uses: seller first, then each UserReferrals parent, up to 5 levels.
    const activeLevels = [];
    let currentUserId = broker.user_id;
    while (currentUserId && activeLevels.length < BROKER_LEVELS) {
      const levelBroker = await db.Brokers.findOne({ where: { user_id: currentUserId } });
      activeLevels.push({ id: levelBroker ? levelBroker.id : null, user_id: currentUserId });

      const ref = await db.UserReferrals.findOne({ where: { user_id: currentUserId } });
      currentUserId = ref?.parent_user_id || null;
    }

    const serviceType = ORDER_TYPE_TO_SERVICE_TYPE[orderType];
    let basePercentages = [50, 20, 15, 10, 5];
    if (serviceType) {
      await db.AdminVariableBrokerCommission.sync();
      const commissionRecords = await db.AdminVariableBrokerCommission.findAll({
        where: { service_type: serviceType },
        order: [["level", "ASC"]],
      });
      if (commissionRecords.length) {
        basePercentages = commissionRecords.map((r) => r.percentage || 0);
      }
    }
    while (basePercentages.length < BROKER_LEVELS) basePercentages.push(0);

    const activeBase = basePercentages.slice(0, activeLevels.length);
    const totalBase = activeBase.reduce((a, b) => a + b, 0);
    const remaining = 100 - totalBase;
    activeBase[0] += remaining; // remainder goes to the seller, same as the existing engine

    const tree = activeLevels.map((b) => b.id).join("->");
    const noteData = {
      entry_id: entry_id ?? null,
      orderType,
      order,
      product,
      amounts,
      commission,
      event: event ?? null,
    };
    const notes = JSON.stringify(noteData);
    const occurredAtDate = occurred_at ? new Date(occurred_at) : new Date();

    const rowsToInsert = [];
    const distribution = [];

    for (let i = 0; i < activeLevels.length; i++) {
      const currentBroker = activeLevels[i];
      const commissionPercent = parseFloat(activeBase[i].toFixed(2));
      // base can legitimately be 0 (a deal with no profit) or negative (a
      // correction/refund, sent as a new entry with corrects_entry_id set)
      // — the same math applies either way, no special-casing needed.
      const commissionAmount = parseFloat(((commissionPercent / 100) * base).toFixed(2));
      const isSeller = i === 0;

      distribution.push({
        level: i + 1,
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        is_seller: isSeller,
      });

      rowsToInsert.push({
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        // order_id is a legacy NOT NULL int(11) from the pre-existing order
        // flow, unrelated to Kontor's own identifiers — 0 is a deliberate
        // "not applicable" sentinel; kontor_idempotency_key is the real key.
        order_id: 0,
        order_type: orderType,
        product_type: "product",
        source: "kontor",
        kontor_idempotency_key: String(idempotency_key),
        kontor_entry_id: isSeller ? (entry_id ? String(entry_id) : null) : null, // unique index — only the seller row carries it
        occurred_at: isNaN(occurredAtDate.getTime()) ? new Date() : occurredAtDate,
        order_amount: centsToAmount(amounts.net_cents) ?? base,
        profit_amount: base,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        tree,
        is_seller: isSeller,
        // Hartmann & Benz only releases a transaction to us after shipment
        // and the 14-day statutory withdrawal period, so by the time Kontor
        // pushes it here it's already final — true for corrections too.
        is_payment_done: true,
        selected_payment_method: 1,
        choose_payment_option: 1,
        notes,
      });
    }

    await db.BrokerCommissionHistory.bulkCreate(rowsToInsert, { ignoreDuplicates: true });

    const sellerRowData = rowsToInsert[0];
    if (sellerRowData?.broker_id) {
      await db.Brokers.increment(
        { total_commission_amount: sellerRowData.commission_amount },
        { where: { id: sellerRowData.broker_id } }
      );
    }

    // Re-fetch rather than trust bulkCreate's returned instances: MySQL's
    // auto-increment counter still advances for a row ignoreDuplicates
    // skips, so Sequelize can't reliably back-fill ids across a batch where
    // one row collided (e.g. a reused kontor_entry_id) — this is the only
    // way to get the seller row's real id for the reference.
    const referenceRow = await db.BrokerCommissionHistory.findOne({
      where: { kontor_idempotency_key: String(idempotency_key), is_seller: true },
    });

    if (!referenceRow) {
      console.error(`[Kontor] capture-order insert produced no seller row for idempotency_key=${idempotency_key}, entry_id=${entry_id} — likely a kontor_entry_id collision with an unrelated booking.`);
      return kontorError(res, 409, "ALREADY_EXISTS", "entry_id conflicts with an existing, unrelated booking.");
    }

    return res.status(200).json({
      success: true,
      reference: `MLM-TX-${String(referenceRow.id).padStart(6, "0")}`,
      distribution,
    });
  } catch (error) {
    console.error("[Kontor] Error in CaptureKontorOrder:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = CaptureKontorOrder;
