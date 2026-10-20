const db = require("../../models");
const { formatTransaction } = require("../../utils/kontorTransactionFormatter");
const { kontorError } = require("../../utils/kontorErrorCodes");

const parseReferenceId = (reference) => {
  const match = String(reference || "").match(/^MLM-TX-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

const GetKontorTransactionById = async (req, res) => {
  try {
    const { entry_id } = req.params;

    // Accepts Kontor's own entry_id (a ULID), our MLM-TX-<id> reference, or
    // our internal numeric row id. Always scoped to source='kontor' so
    // nothing from the non-Kontor order flow leaks.
    const referenceId = parseReferenceId(entry_id);
    const isNumeric = /^\d+$/.test(entry_id);

    let where;
    if (referenceId) {
      where = { id: referenceId, source: "kontor" };
    } else if (isNumeric) {
      where = { id: entry_id, source: "kontor" };
    } else {
      where = { kontor_entry_id: entry_id, source: "kontor" };
    }

    const row = await db.BrokerCommissionHistory.findOne({ where });

    if (!row) {
      return kontorError(res, 404, "NOT_FOUND", "No Kontor transaction found for this entry_id");
    }

    const broker = row.broker_id ? await db.Brokers.findOne({ where: { id: row.broker_id } }) : null;

    return res.status(200).json({
      success: true,
      data: formatTransaction(row, broker),
    });
  } catch (error) {
    console.error("[Kontor] Error in GetKontorTransactionById:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = GetKontorTransactionById;
