const db = require("../../models");
const { Op } = require("sequelize");
const { formatTransaction } = require("../../utils/kontorTransactionFormatter");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const GetKontorTransactions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const since = req.query.since ? new Date(req.query.since) : null;
    const partner = req.query.partner ? String(req.query.partner) : null;

    if (req.query.since && isNaN(since.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid since. Use an ISO date/datetime.",
      });
    }

    const where = { source: "kontor" };
    if (cursor) where.id = { [Op.gt]: cursor };
    // occurred_at (when the event happened on Kontor's side) rather than
    // createdAt (when we processed it) — matches how Kontor will reason
    // about "since".
    if (since) where.occurred_at = { [Op.gte]: since };

    if (partner) {
      const broker = await db.Brokers.findOne({
        where: {
          source: "kontor",
          [Op.or]: [{ mlm_customer_number: partner }, { external_ref: partner }],
        },
      });
      if (!broker) {
        return res.status(200).json({
          success: true,
          message: "Transactions retrieved successfully",
          data: { transactions: [], next_cursor: null },
        });
      }
      where.broker_id = broker.id;
    }

    const rows = await db.BrokerCommissionHistory.findAll({
      where,
      order: [["id", "ASC"]],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const brokerIds = [...new Set(page.map((r) => r.broker_id).filter(Boolean))];
    const brokers = brokerIds.length
      ? await db.Brokers.findAll({ where: { id: { [Op.in]: brokerIds } } })
      : [];
    const brokerById = {};
    brokers.forEach((b) => { brokerById[b.id] = b; });

    const transactions = page.map((row) => formatTransaction(row, brokerById[row.broker_id]));

    return res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully",
      data: {
        transactions,
        next_cursor: hasMore ? String(page[page.length - 1].id) : null,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in GetKontorTransactions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetKontorTransactions;
