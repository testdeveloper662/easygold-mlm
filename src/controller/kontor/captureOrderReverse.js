const db = require("../../models");
const { kontorError } = require("../../utils/kontorErrorCodes");

const centsToAmount = (cents) => (cents === undefined || cents === null ? null : Math.round(Number(cents)) / 100);

const parseReferenceId = (reference) => {
  const match = String(reference || "").match(/^MLM-TX-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

const ReverseKontorOrder = async (req, res) => {
  try {
    const {
      entry_id,
      corrects_entry_id,
      corrects_reference,
      event,
      occurred_at,
      amounts = {},
      commission = {},
    } = req.body;
    const idempotency_key = req.body.idempotency_key || req.headers["idempotency-key"];

    if (!idempotency_key || (!corrects_entry_id && !corrects_reference)) {
      return kontorError(res, 400, "VALIDATION_ERROR", "Missing required fields: idempotency_key, corrects_entry_id (or corrects_reference)");
    }

    // Dedupe the reversal itself — a retried call with the same
    // idempotency_key returns the existing reversal, doesn't double-book it.
    const existingReversal = await db.BrokerCommissionHistory.findOne({
      where: { kontor_idempotency_key: String(idempotency_key), is_seller: true },
    });
    if (existingReversal) {
      return res.status(200).json({
        success: true,
        reference: `MLM-TX-${String(existingReversal.id).padStart(6, "0")}`,
        offset_against_payout: true,
      });
    }

    // Find the original seller row via corrects_entry_id (Kontor's ULID) or
    // corrects_reference (our own MLM-TX-<id> string), then use its
    // idempotency_key to pull every level of the original booking.
    let originalSellerRow = null;
    if (corrects_entry_id) {
      originalSellerRow = await db.BrokerCommissionHistory.findOne({
        where: { kontor_entry_id: String(corrects_entry_id), is_seller: true },
      });
    }
    if (!originalSellerRow && corrects_reference) {
      const originalId = parseReferenceId(corrects_reference);
      if (originalId) {
        originalSellerRow = await db.BrokerCommissionHistory.findOne({
          where: { id: originalId, is_seller: true },
        });
      }
    }
    if (!originalSellerRow) {
      return kontorError(res, 404, "NOT_FOUND", "No original booking found for this corrects_entry_id/corrects_reference");
    }

    const originalRows = await db.BrokerCommissionHistory.findAll({
      where: { kontor_idempotency_key: originalSellerRow.kontor_idempotency_key },
      order: [["id", "ASC"]],
    });

    // The reversal carries its own commission.basis_net_cents (already
    // negative) — distribute that across the original tree using each
    // level's original commission_percent, rather than just negating the
    // original amounts. This also handles a partial reversal correctly.
    const reversalBase = commission.basis_net_cents !== undefined ? centsToAmount(commission.basis_net_cents) : null;
    const occurredAtDate = occurred_at ? new Date(occurred_at) : new Date();
    const notes = JSON.stringify({
      source: "kontor",
      type: "reversal",
      corrects_entry_id: corrects_entry_id ?? null,
      corrects_reference: corrects_reference ?? null,
      event: event ?? null,
      amounts,
      commission,
    });

    const reversalRows = originalRows.map((row) => {
      const commissionAmount =
        reversalBase !== null
          ? parseFloat(((row.commission_percent / 100) * reversalBase).toFixed(2))
          : -row.commission_amount;

      return {
        broker_id: row.broker_id,
        user_id: row.user_id,
        order_id: 0,
        kontor_idempotency_key: String(idempotency_key),
        kontor_entry_id: row.is_seller ? (entry_id ? String(entry_id) : null) : null,
        occurred_at: isNaN(occurredAtDate.getTime()) ? new Date() : occurredAtDate,
        order_type: row.order_type,
        product_type: row.product_type,
        source: "kontor",
        order_amount: centsToAmount(amounts.net_cents) ?? -row.order_amount,
        profit_amount: reversalBase !== null ? reversalBase : -row.profit_amount,
        commission_percent: row.commission_percent,
        commission_amount: commissionAmount,
        tree: row.tree,
        is_seller: row.is_seller,
        is_payment_done: row.is_payment_done,
        selected_payment_method: row.selected_payment_method,
        choose_payment_option: row.choose_payment_option,
        notes,
      };
    });

    await db.BrokerCommissionHistory.bulkCreate(reversalRows, { ignoreDuplicates: true });

    const sellerReversal = reversalRows.find((r) => r.is_seller);
    if (sellerReversal?.broker_id) {
      await db.Brokers.increment(
        { total_commission_amount: sellerReversal.commission_amount },
        { where: { id: sellerReversal.broker_id } }
      );
    }

    // Re-fetch rather than trust bulkCreate's returned instances — see
    // captureOrder.js for why ids can't be trusted across a batch where
    // ignoreDuplicates silently skipped a row.
    const referenceRow = await db.BrokerCommissionHistory.findOne({
      where: { kontor_idempotency_key: String(idempotency_key), is_seller: true },
    });

    if (!referenceRow) {
      console.error(`[Kontor] capture-order/reverse insert produced no seller row for idempotency_key=${idempotency_key}, entry_id=${entry_id} — likely a kontor_entry_id collision with an unrelated booking.`);
      return kontorError(res, 409, "ALREADY_EXISTS", "entry_id conflicts with an existing, unrelated booking.");
    }

    return res.status(200).json({
      success: true,
      reference: `MLM-TX-${String(referenceRow.id).padStart(6, "0")}`,
      // Hartmann & Benz only releases a transaction to us after shipment and
      // the 14-day withdrawal period, so by the time a reversal reaches us
      // the original is always already payable/paid — this always offsets
      // a future payout rather than cancelling an unpaid booking outright.
      offset_against_payout: true,
    });
  } catch (error) {
    console.error("[Kontor] Error in ReverseKontorOrder:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = ReverseKontorOrder;
