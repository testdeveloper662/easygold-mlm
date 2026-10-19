const db = require("../../models");

const ReverseKontorOrder = async (req, res) => {
  try {
    const { idempotency_key, original_idempotency_key, reason } = req.body;

    if (!idempotency_key || !original_idempotency_key) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: idempotency_key, original_idempotency_key",
      });
    }

    // Dedupe the reversal itself — a retried call with the same
    // idempotency_key returns the existing reversal, doesn't double-book it.
    // Dedicated column, not order_id — see captureOrder.js for why.
    const existingReversal = await db.BrokerCommissionHistory.findOne({
      where: { kontor_idempotency_key: String(idempotency_key), is_seller: true },
    });
    if (existingReversal) {
      return res.status(200).json({
        success: true,
        message: "Reversal already booked for this idempotency_key",
        data: { reference_id: `KONTOR-REV-${existingReversal.id}`, idempotency_key },
      });
    }

    const originalRows = await db.BrokerCommissionHistory.findAll({
      where: { kontor_idempotency_key: String(original_idempotency_key) },
    });

    if (!originalRows.length) {
      return res.status(404).json({
        success: false,
        message: "No original order found for this original_idempotency_key",
      });
    }

    const notes = JSON.stringify({
      source: "kontor",
      type: "reversal",
      original_idempotency_key,
      reason: reason ?? null,
    });

    const reversalRows = originalRows.map((row) => ({
      broker_id: row.broker_id,
      user_id: row.user_id,
      // order_id is a legacy NOT NULL int(11) — carry the original row's
      // numeric value forward rather than trying to fit the string key in it.
      order_id: row.order_id,
      kontor_idempotency_key: String(idempotency_key),
      order_type: row.order_type,
      product_type: row.product_type,
      source: "kontor",
      order_amount: -row.order_amount,
      profit_amount: -row.profit_amount,
      commission_percent: row.commission_percent,
      commission_amount: -row.commission_amount,
      tree: row.tree,
      is_seller: row.is_seller,
      is_payment_done: row.is_payment_done,
      selected_payment_method: row.selected_payment_method,
      choose_payment_option: row.choose_payment_option,
      notes,
    }));

    const created = await db.BrokerCommissionHistory.bulkCreate(reversalRows, { ignoreDuplicates: true });

    const sellerOriginal = originalRows.find((r) => r.is_seller);
    if (sellerOriginal?.broker_id) {
      await db.Brokers.increment(
        { total_commission_amount: -sellerOriginal.commission_amount },
        { where: { id: sellerOriginal.broker_id } }
      );
    }

    const referenceRow = created.find((r) => r.is_seller) || created[0];
    const totalReversed = reversalRows.reduce((sum, r) => sum + r.commission_amount, 0);

    return res.status(200).json({
      success: true,
      message: "Reversal booked successfully",
      data: {
        reference_id: `KONTOR-REV-${referenceRow?.id ?? ""}`,
        idempotency_key,
        original_idempotency_key,
        rows_reversed: reversalRows.length,
        total_commission_reversed: Math.round(totalReversed * 100) / 100,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in ReverseKontorOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = ReverseKontorOrder;
