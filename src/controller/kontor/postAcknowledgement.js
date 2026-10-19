const db = require("../../models");

// reference_id is our own booking reference as returned by capture-order /
// capture-order/reverse, formatted "KONTOR-CMM-<id>" or "KONTOR-REV-<id>".
const parseEntryIdFromReference = (referenceId) => {
  const match = String(referenceId || "").match(/^KONTOR-(?:CMM|REV)-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

const PostKontorAcknowledgement = async (req, res) => {
  try {
    const { reference_id, booking_reference, acknowledged_at } = req.body;
    const reference = reference_id || booking_reference;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: reference_id",
      });
    }

    const entryId = parseEntryIdFromReference(reference);
    if (!entryId) {
      return res.status(400).json({
        success: false,
        message: "Unrecognized reference_id format. Expected KONTOR-CMM-<id> or KONTOR-REV-<id>.",
      });
    }

    const row = await db.BrokerCommissionHistory.findOne({
      where: { id: entryId, source: "kontor" },
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "No Kontor transaction found for this reference_id",
      });
    }

    const ackTimestamp = acknowledged_at ? new Date(acknowledged_at) : new Date();
    await row.update({ kontor_acknowledged_at: isNaN(ackTimestamp.getTime()) ? new Date() : ackTimestamp });

    return res.status(200).json({
      success: true,
      message: "Acknowledgement recorded",
      data: {
        reference_id: reference,
        entry_id: row.id,
        acknowledged_at: row.kontor_acknowledged_at,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in PostKontorAcknowledgement:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = PostKontorAcknowledgement;
