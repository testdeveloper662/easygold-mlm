const db = require("../../models");
const { kontorError } = require("../../utils/kontorErrorCodes");

// reference is our own booking reference as returned by capture-order /
// capture-order/reverse, formatted "MLM-TX-<6-digit id>".
const parseEntryIdFromReference = (reference) => {
  const match = String(reference || "").match(/^MLM-TX-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

const PostKontorAcknowledgement = async (req, res) => {
  try {
    const { reference, acknowledged_at } = req.body;

    if (!reference) {
      return kontorError(res, 400, "VALIDATION_ERROR", "Missing required field: reference");
    }

    const entryId = parseEntryIdFromReference(reference);
    if (!entryId) {
      return kontorError(res, 400, "VALIDATION_ERROR", "Unrecognized reference format. Expected MLM-TX-<id>.");
    }

    const row = await db.BrokerCommissionHistory.findOne({
      where: { id: entryId, source: "kontor" },
    });

    if (!row) {
      return kontorError(res, 404, "NOT_FOUND", "No Kontor transaction found for this reference");
    }

    const ackTimestamp = acknowledged_at ? new Date(acknowledged_at) : new Date();
    await row.update({ kontor_acknowledged_at: isNaN(ackTimestamp.getTime()) ? new Date() : ackTimestamp });

    return res.status(200).json({
      success: true,
      reference,
      acknowledged_at: row.kontor_acknowledged_at,
    });
  } catch (error) {
    console.error("[Kontor] Error in PostKontorAcknowledgement:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = PostKontorAcknowledgement;
