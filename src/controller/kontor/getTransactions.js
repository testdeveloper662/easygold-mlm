const db = require("../../models");
const { Op } = require("sequelize");
const { formatTransaction } = require("../../utils/kontorTransactionFormatter");
const { kontorError } = require("../../utils/kontorErrorCodes");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const GetKontorTransactions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;
    const since = req.query.since ? new Date(req.query.since) : null;
    const partner = req.query.partner ? String(req.query.partner) : null;

    if (req.query.since && isNaN(since.getTime())) {
      return kontorError(res, 400, "VALIDATION_ERROR", "Invalid since. Use an ISO date/datetime.");
    }

    const where = { source: "kontor" };
    if (cursor) where.id = { [Op.gt]: cursor };
    // occurred_at (when the event happened on Kontor's side) rather than
    // createdAt (when we processed it) — matches how Kontor will reason
    // about "since".
    if (since) where.occurred_at = { [Op.gte]: since };

    if (partner) {
      const isNumeric = /^\d+$/.test(partner);
      const broker = await db.Brokers.findOne({
        where: isNumeric
          ? { source: "kontor", [Op.or]: [{ id: partner }, { external_ref: partner }, { mlm_customer_number: partner }] }
          : { source: "kontor", [Op.or]: [{ external_ref: partner }, { mlm_customer_number: partner }] },
      });
      if (!broker) {
        return res.status(200).json({
          success: true,
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
      data: {
        transactions,
        next_cursor: hasMore ? String(page[page.length - 1].id) : null,
      },
    });
  } catch (error) {
    console.error("[Kontor] Error in GetKontorTransactions:", error);
    return kontorError(res, 500, "INTERNAL_ERROR", "Internal server error");
  }
};

module.exports = GetKontorTransactions;
