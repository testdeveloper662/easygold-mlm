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

  // Grouped by basis_kind too (QK-14), so manual_share and structure_share
  // can be reported as their own counts/totals instead of one blended number.
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
      "basis_kind",
      [db.sequelize.fn("COUNT", db.sequelize.col("broker_commission_histories.id")), "row_count"],
      [db.sequelize.fn("SUM", db.sequelize.col("order_amount")), "total_order_amount"],
      [db.sequelize.fn("SUM", db.sequelize.col("commission_amount")), "total_commission_amount"],
    ],
    group: ["broker_id", "basis_kind"],
    raw: true,
  });

  const brokerIds = [...new Set(rows.map((r) => r.broker_id).filter(Boolean))];
  const brokers = brokerIds.length
    ? await db.Brokers.findAll({
        where: { id: { [Op.in]: brokerIds } },
        attributes: ["id", "external_ref", "mlm_customer_number"],
      })
    : [];
  const brokerMap = {};
  brokers.forEach((b) => { brokerMap[b.id] = b; });

  const byBroker = {};
  rows.forEach((r) => {
    const key = r.broker_id;
    if (!byBroker[key]) {
      const broker = brokerMap[key];
      byBroker[key] = {
        broker_id: key,
        external_ref: broker?.external_ref || null,
        mlm_customer_number: broker?.mlm_customer_number || null,
        order_count: 0,
        total_order_amount: 0,
        total_commission_amount: 0,
        manual_share_count: 0,
        manual_share_cents: 0,
        structure_share_count: 0,
        structure_share_cents: 0,
      };
    }

    const entry = byBroker[key];
    const rowCount = Number(r.row_count) || 0;
    const orderAmount = Number(r.total_order_amount) || 0;
    const commissionAmount = Number(r.total_commission_amount) || 0;
    const commissionCents = Math.round(commissionAmount * 100);

    entry.order_count += rowCount;
    entry.total_order_amount += orderAmount;
    entry.total_commission_amount += commissionAmount;

    if (r.basis_kind === "structure_share") {
      entry.structure_share_count += rowCount;
      entry.structure_share_cents += commissionCents;
    } else {
      entry.manual_share_count += rowCount;
      entry.manual_share_cents += commissionCents;
    }
  });

  const brokerTotals = Object.values(byBroker).map((b) => ({
    ...b,
    total_order_amount: Math.round(b.total_order_amount * 100) / 100,
    total_commission_amount: Math.round(b.total_commission_amount * 100) / 100,
  }));

  const totals = brokerTotals.reduce(
    (acc, b) => {
      acc.order_count += b.order_count;
      acc.total_order_amount += b.total_order_amount;
      acc.total_commission_amount += b.total_commission_amount;
      acc.manual_share_count += b.manual_share_count;
      acc.manual_share_cents += b.manual_share_cents;
      acc.structure_share_count += b.structure_share_count;
      acc.structure_share_cents += b.structure_share_cents;
      return acc;
    },
    {
      order_count: 0,
      total_order_amount: 0,
      total_commission_amount: 0,
      manual_share_count: 0,
      manual_share_cents: 0,
      structure_share_count: 0,
      structure_share_cents: 0,
    }
  );
  totals.total_order_amount = Math.round(totals.total_order_amount * 100) / 100;
  totals.total_commission_amount = Math.round(totals.total_commission_amount * 100) / 100;

  return { date: startOfDay.toISOString().slice(0, 10), brokers: brokerTotals, totals };
};

module.exports = { getOurDailyTotals };
