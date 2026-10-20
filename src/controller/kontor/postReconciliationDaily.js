const { getOurDailyTotals } = require("../../utils/kontorReconciliationHelper");
const { kontorError } = require("../../utils/kontorErrorCodes");

const AMOUNT_TOLERANCE = 0.01;

// Kontor pushes their own computed daily totals here so we can compare them
// against ours. Nothing is persisted (no agreed storage shape yet) — this
// computes a live diff and returns it; the raw submission is logged for an
// audit trail in the meantime.
const PostKontorDailyReconciliation = async (req, res) => {
  try {
    const { date, brokers } = req.body;

    if (!date || !Array.isArray(brokers)) {
      return kontorError(res, 400, "VALIDATION_ERROR", "Missing required fields: date, brokers (array)");
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return kontorError(res, 400, "VALIDATION_ERROR", "Invalid date. Use format YYYY-MM-DD.");
    }

    console.log(`[Kontor] Received daily reconciliation submission for ${date}:`, JSON.stringify(req.body));

    const ours = await getOurDailyTotals(targetDate);
    const ourByKey = {};
    ours.brokers.forEach((b) => {
      if (b.broker_id) ourByKey[b.broker_id] = b;
      if (b.external_ref) ourByKey[b.external_ref] = b;
      if (b.mlm_customer_number) ourByKey[b.mlm_customer_number] = b;
    });

    const matchedKeys = new Set();
    const comparison = brokers.map((theirs) => {
      const key = theirs.broker_id || theirs.external_ref || theirs.mlm_customer_number || theirs.partner;
      const ourEntry = key ? ourByKey[key] : null;
      if (ourEntry) matchedKeys.add(ourEntry.broker_id);

      const theirAmount = Number(theirs.total_commission_amount) || 0;
      const ourAmount = ourEntry?.total_commission_amount || 0;
      const amountMatches = Math.abs(theirAmount - ourAmount) < AMOUNT_TOLERANCE;
      const countMatches = ourEntry
        ? Number(theirs.order_count) === ourEntry.order_count
        : Number(theirs.order_count) === 0;

      return {
        partner: key || null,
        match: Boolean(ourEntry) && amountMatches && countMatches,
        theirs: {
          order_count: theirs.order_count ?? null,
          total_commission_amount: theirs.total_commission_amount ?? null,
        },
        ours: ourEntry
          ? { order_count: ourEntry.order_count, total_commission_amount: ourEntry.total_commission_amount }
          : { order_count: 0, total_commission_amount: 0 },
      };
    });

    // Brokers we have totals for that weren't present in their submission at all.
    const missingFromTheirSubmission = ours.brokers
      .filter((b) => !matchedKeys.has(b.broker_id))
      .map((b) => ({
        partner: b.broker_id,
        external_ref: b.external_ref,
        ours: { order_count: b.order_count, total_commission_amount: b.total_commission_amount },
      }));

    const allMatch = comparison.every((c) => c.match) && missingFromTheirSubmission.length === 0;

    return res.status(200).json({
      success: true,
      date: ours.date,
      all_match: allMatch,
      comparison,
      missing_from_submission: missingFromTheirSubmission,
      our_totals: ours.totals,
    });
  } catch (error) {
    console.error("[Kontor] Error in PostKontorDailyReconciliation:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = PostKontorDailyReconciliation;
