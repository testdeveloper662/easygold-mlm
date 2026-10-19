const db = require("../../models");

// Kontor channel -> internal MLM order_type, confirmed by both sides.
// "abonnement" (package subscriptions) has no agreed type yet — business
// decision pending — so it's deliberately absent and handled as a skip.
// "diamonds" isn't in Kontor's latest channel list but is kept as a safety
// net in case it's reintroduced later.
const CHANNEL_TO_ORDER_TYPE = {
  kundenbestellung: "my_store",
  mystore: "my_store",
  diamonds: "diamond_gemstone",
  preisfixierung: "goldprice_fixing",
  ankauf: "gold_purchase_sell_orders",
  firmenbestellung: "dealer_purchasing",
};

const ORDER_TYPE_TO_SERVICE_TYPE = {
  my_store: "My Store",
  diamond_gemstone: "Diamond & Gemstone",
  goldprice_fixing: "Gold Price Fixation",
  gold_purchase_sell_orders: "Gold Purchase",
  dealer_purchasing: "Dealer Purchasing",
};

const BROKER_LEVELS = 5;
const centsToAmount = (cents) => (cents === undefined || cents === null ? null : Math.round(Number(cents)) / 100);

const CaptureKontorOrder = async (req, res) => {
  try {
    const {
      entry_id,
      idempotency_key,
      seq,
      mode,
      partner = {},
      referrer = {},
      source = {},
      channel,
      direction = "sale",
      product = {},
      quantity,
      amounts = {},
      commission = {},
      seller = {},
      customer_type,
      event,
      entry_kind,
      corrects_entry_id,
      occurred_at,
    } = req.body;

    const { customer_no: partnerCustomerNo, mlm_customer_number: partnerMlmNumber } = partner;
    const { basis_net_cents } = commission;

    if (!idempotency_key || !channel || (!partnerCustomerNo && !partnerMlmNumber) || basis_net_cents === undefined || basis_net_cents === null) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: idempotency_key, channel, partner.customer_no (or partner.mlm_customer_number), commission.basis_net_cents",
      });
    }

    const base = centsToAmount(basis_net_cents);
    if (!Number.isFinite(base)) {
      return res.status(400).json({
        success: false,
        message: "commission.basis_net_cents must be a number",
      });
    }

    // Idempotency: dedupe against Kontor's idempotency_key before booking
    // any commission — a retried push, or a resend of an already-processed
    // event, returns the existing booking instead of double-booking.
    // Dedicated column, not order_id — order_id is a legacy int(11) from the
    // pre-existing order flow and can't hold an arbitrary string like this.
    const existing = await db.BrokerCommissionHistory.findOne({
      where: { kontor_idempotency_key: String(idempotency_key), is_seller: true },
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Commission already calculated for this transaction",
        data: { reference_id: `KONTOR-CMM-${existing.id}`, idempotency_key, kontor_entry_id: existing.kontor_entry_id },
      });
    }

    const noteData = {
      entry_id: entry_id ?? null,
      seq: seq ?? null,
      source,
      channel,
      direction,
      product,
      quantity: quantity ?? null,
      amounts,
      commission,
      seller,
      customer_type: customer_type ?? null,
      event: event ?? null,
      entry_kind: entry_kind ?? null,
      corrects_entry_id: corrects_entry_id ?? null,
      referrer,
    };

    // Kontor sends everything and expects us to filter what counts for
    // commission. Subscriptions have no agreed order type yet; entries
    // explicitly marked informational (e.g. house-fulfilled sales with no
    // partner commission) are acknowledged but not booked.
    if (String(direction).toLowerCase() === "subscription") {
      return res.status(200).json({
        success: true,
        message: "Received — no commission booked (subscription order type not yet agreed)",
        data: { idempotency_key, skipped: true, reason: "subscription_not_supported" },
      });
    }
    if (commission.informational === true) {
      return res.status(200).json({
        success: true,
        message: "Received — no commission booked (marked informational)",
        data: { idempotency_key, skipped: true, reason: "informational" },
      });
    }

    const orderType = CHANNEL_TO_ORDER_TYPE[String(channel).toLowerCase().trim()];
    if (!orderType) {
      return res.status(400).json({
        success: false,
        message: `Unrecognized channel: ${channel}. Must map to one of: ${Object.keys(CHANNEL_TO_ORDER_TYPE).join(", ")}`,
      });
    }

    // mlm_customer_number is the identifier Kontor is told to store and send
    // with every transaction; customer_no is accepted as a fallback.
    let broker = null;
    if (partnerMlmNumber) {
      broker = await db.Brokers.findOne({ where: { mlm_customer_number: String(partnerMlmNumber) } });
    }
    if (!broker && partnerCustomerNo) {
      broker = await db.Brokers.findOne({
        where: { source: "kontor", external_ref: String(partnerCustomerNo) },
      });
    }
    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "No Kontor-sourced broker found for this partner.mlm_customer_number/customer_no",
      });
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
    await db.AdminVariableBrokerCommission.sync();
    const commissionRecords = await db.AdminVariableBrokerCommission.findAll({
      where: { service_type: serviceType },
      order: [["level", "ASC"]],
    });

    let basePercentages = commissionRecords.length
      ? commissionRecords.map((r) => r.percentage || 0)
      : [50, 20, 15, 10, 5];
    while (basePercentages.length < BROKER_LEVELS) basePercentages.push(0);

    const activeBase = basePercentages.slice(0, activeLevels.length);
    const totalBase = activeBase.reduce((a, b) => a + b, 0);
    const remaining = 100 - totalBase;
    activeBase[0] += remaining; // remainder goes to the seller, same as the existing engine

    const tree = activeLevels.map((b) => b.id).join("->");
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
        // flow — Kontor's seq is the closest numeric equivalent available;
        // falls back to 0 when absent. kontor_idempotency_key is the real
        // dedup key for Kontor rows, not this column.
        order_id: Number.isFinite(Number(seq)) ? Number(seq) : 0,
        order_type: orderType,
        product_type: "product",
        source: "kontor",
        // Shared across every level of this booking, so findAll() can
        // retrieve them all (e.g. for a future reversal) by this key alone.
        kontor_idempotency_key: String(idempotency_key),
        // Unique-indexed — only the seller row carries Kontor's entry_id,
        // to avoid a constraint violation across the other level rows.
        kontor_entry_id: isSeller ? (entry_id ? String(entry_id) : null) : null,
        occurred_at: isNaN(occurredAtDate.getTime()) ? new Date() : occurredAtDate,
        kontor_mode: mode || null,
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

    const created = await db.BrokerCommissionHistory.bulkCreate(rowsToInsert, { ignoreDuplicates: true });

    const sellerRow = rowsToInsert[0];
    if (sellerRow?.broker_id) {
      await db.Brokers.increment(
        { total_commission_amount: sellerRow.commission_amount },
        { where: { id: sellerRow.broker_id } }
      );
    }

    const referenceRow = created.find((r) => r.is_seller) || created[0];

    return res.status(200).json({
      success: true,
      message: "Commission distribution stored successfully",
      data: {
        reference_id: `KONTOR-CMM-${referenceRow?.id ?? ""}`,
        idempotency_key,
        kontor_entry_id: entry_id ?? null,
        tree,
        distribution,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in CaptureKontorOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = CaptureKontorOrder;
