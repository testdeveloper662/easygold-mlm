const db = require("../models");
const { Op } = require("sequelize");

// Shared by the GET (our totals) and POST (compare against Kontor's
// submitted totals) reconciliation endpoints so both read from one place.
const getOurDailyTotals = async (targetDate) => {
  // UTC boundaries, not local server time — an ISO date string like
  // "2026-10-18" parses as UTC midnight, and setHours() (local) would shift
  // that to a different calendar day on any non-UTC server (confirmed: it
  // did, on this IST server). "date" means the UTC calendar day throughout.
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const rows = await db.BrokerCommissionHistory.findAll({
    where: {
      // occurred_at (when the event happened on Kontor's side) rather than
      // createdAt (when we processed it) — matches how Kontor computes
      // their own daily totals for comparison.
      occurred_at: { [Op.between]: [startOfDay, endOfDay] },
      is_deleted: false,
      source: "kontor",
    },
    attributes: [
      "broker_id",
      [db.sequelize.fn("COUNT", db.sequelize.col("broker_commission_histories.id")), "order_count"],
      [db.sequelize.fn("SUM", db.sequelize.col("order_amount")), "total_order_amount"],
      [db.sequelize.fn("SUM", db.sequelize.col("commission_amount")), "total_commission_amount"],
    ],
    group: ["broker_id"],
    raw: true,
  });

  const brokerIds = rows.map((r) => r.broker_id).filter(Boolean);
  const brokers = brokerIds.length
    ? await db.Brokers.findAll({
        where: { id: { [Op.in]: brokerIds } },
        attributes: ["id", "external_ref", "mlm_customer_number"],
      })
    : [];
  const brokerMap = {};
  brokers.forEach((b) => { brokerMap[b.id] = b; });

  const brokerTotals = rows.map((r) => {
    const broker = brokerMap[r.broker_id];
    return {
      broker_id: r.broker_id,
      customer_no: broker?.external_ref || null,
      mlm_customer_number: broker?.mlm_customer_number || null,
      order_count: Number(r.order_count) || 0,
      total_order_amount: Math.round((Number(r.total_order_amount) || 0) * 100) / 100,
      total_commission_amount: Math.round((Number(r.total_commission_amount) || 0) * 100) / 100,
    };
  });

  const totals = brokerTotals.reduce(
    (acc, b) => {
      acc.order_count += b.order_count;
      acc.total_order_amount += b.total_order_amount;
      acc.total_commission_amount += b.total_commission_amount;
      return acc;
    },
    { order_count: 0, total_order_amount: 0, total_commission_amount: 0 }
  );
  totals.total_order_amount = Math.round(totals.total_order_amount * 100) / 100;
  totals.total_commission_amount = Math.round(totals.total_commission_amount * 100) / 100;

  return { date: startOfDay.toISOString().slice(0, 10), brokers: brokerTotals, totals };
};

module.exports = { getOurDailyTotals };
