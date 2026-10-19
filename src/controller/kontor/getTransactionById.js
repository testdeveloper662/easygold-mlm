const db = require("../../models");
const { formatTransaction } = require("../../utils/kontorTransactionFormatter");

const GetKontorTransactionById = async (req, res) => {
  try {
    const { entry_id } = req.params;

    // Accept either Kontor's own entry_id (a ULID string, the primary case)
    // or our internal numeric row id (for our own debugging). Always scoped
    // to source='kontor' so nothing from the non-Kontor order flow leaks.
    const isNumeric = /^\d+$/.test(entry_id);
    const row = await db.BrokerCommissionHistory.findOne({
      where: isNumeric
        ? { id: entry_id, source: "kontor" }
        : { kontor_entry_id: entry_id, source: "kontor" },
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "No Kontor transaction found for this entry_id",
      });
    }

    const broker = row.broker_id ? await db.Brokers.findOne({ where: { id: row.broker_id } }) : null;

    return res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: formatTransaction(row, broker),
    });
  } catch (error) {
    console.error("[Kontor] Error in GetKontorTransactionById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetKontorTransactionById;
