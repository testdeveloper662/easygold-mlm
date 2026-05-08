const db = require("../../models");
const { sequelize } = require("../../config/database");

const GetAllBrokerCommissionHistory = async (req, res) => {
  try {
    const [columnCheck] = await sequelize.query(
      "SHOW COLUMNS FROM broker_commission_histories LIKE 'is_payment_declined'"
    );

    if (columnCheck.length === 0) {
      console.log("⚠️ is_payment_declined column doesn't exist. Creating it now...");
      await sequelize.query(`
        ALTER TABLE broker_commission_histories
        ADD COLUMN is_payment_declined TINYINT(1) NOT NULL DEFAULT 0
        AFTER is_payment_done
      `);
      console.log("✅ is_payment_declined column created successfully");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").replace(/[^0-9]/g, "");

    const [countResult] = await sequelize.query(`
      SELECT COUNT(DISTINCT CONCAT(order_id, '_', order_type)) as total
      FROM broker_commission_histories
      WHERE is_deleted = 0
      ${search ? "AND order_id LIKE :search" : ""}
    `, {
      replacements: search ? { search: `%${search}%` } : {},
    });

    const totalOrders = countResult[0]?.total || 0;

    const [orderIds] = await sequelize.query(`
      SELECT DISTINCT order_id, order_type
      FROM broker_commission_histories
      WHERE is_deleted = 0
      ${search ? "AND order_id LIKE :search" : ""}
      ORDER BY createdAt DESC
      LIMIT :limit OFFSET :offset
    `, {
      replacements: search
        ? { limit, offset, search: `%${search}%` }
        : { limit, offset },
    });

    if (!orderIds || orderIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All brokers commission history fetched successfully.",
        data: [],
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalItems: totalOrders,
          itemsPerPage: limit,
        },
      });
    }

    const orderPairs = orderIds.map((row) => ({
      order_id: row.order_id,
      order_type: row.order_type,
    }));

    const whereConditions = orderPairs
      .map(
        (_, index) =>
          `(bch.order_id = :order_id_${index} AND bch.order_type = :order_type_${index})`
      )
      .join(" OR ");

    const replacements = {};
    orderPairs.forEach((pair, index) => {
      replacements[`order_id_${index}`] = pair.order_id;
      replacements[`order_type_${index}`] = pair.order_type;
    });

    const [results] = await sequelize.query(`
      SELECT
        bch.id,
        bch.order_id,
        bch.order_type,
        bch.order_amount,
        bch.profit_amount,
        bch.broker_id,
        bch.user_id,
        bch.commission_percent,
        bch.commission_amount,
        bch.is_seller,
        bch.is_payment_done,
        bch.is_payment_declined,
        bch.selected_payment_method,
        bch.tree,
        bch.createdAt,
        bch.updatedAt,
        u.user_email,

        mc.amount AS manual_commission_amount,
        mc.created_at AS manual_commission_date,
        mc.notes AS manual_commission_notes,
        mc.id AS manual_commission_id

      FROM broker_commission_histories AS bch
      LEFT JOIN 6LWUP_users AS u 
             ON u.ID = bch.user_id

      LEFT JOIN manual_commissions AS mc
             ON mc.order_id = bch.order_id
            AND mc.broker_id = bch.broker_id
            AND mc.status IN ('active','fully_settled')

      WHERE bch.is_deleted = 0
      AND (${whereConditions})
      ORDER BY bch.createdAt DESC
    `, {
      replacements,
    });

    // ONLY SHOW GENERAL ADVANCE IF EXISTS (NO SETTLEMENT HERE)
    for (let i = 0; i < results.length; i++) {
      const record = results[i];

      if (record.manual_commission_id) continue;

      const generalAdvance = await db.ManualCommissions.findOne({
        where: {
          broker_id: record.broker_id,
          order_id: null,
          status: "active",
          commission_type: "advance",
        },
        order: [["created_at", "ASC"]],
        raw: true,
      });

      if (generalAdvance) {
        record.general_advance_id = generalAdvance.id;
        record.general_advance_remaining = parseFloat(generalAdvance.remaining_amount || 0);
      } else {
        record.general_advance_id = null;
        record.general_advance_remaining = null;
      }
    }

    const groupedMap = results.reduce((acc, record) => {
      const orderKey = `${record.order_id}_${record.order_type}`;

      if (!acc[orderKey]) {
        acc[orderKey] = {
          order_id: record.order_id,
          order_type: record.order_type,
          order_amount: record.order_amount,
          profit_amount: record.profit_amount,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          broker_commissions: [],
          tree: record.tree,
          payment_type:
            record.selected_payment_method === 1
              ? "Bank Transfer"
              : record.selected_payment_method === 2
              ? "Crypto Payment"
              : record.selected_payment_method === 3
              ? "Cash"
              : record.selected_payment_method === 4
              ? "Card"
              : null,
        };
      }

      acc[orderKey].broker_commissions.push({
        broker_id: record.broker_id,
        user_id: record.user_id,
        user_email: record.user_email,
        commission_percent: parseFloat(record.commission_percent || 0),
        commission_amount: parseFloat(record.commission_amount || 0),
        is_seller: record.is_seller,
        is_payment_done: record.is_payment_done,
        is_payment_declined: record.is_payment_declined,
        tree: record.tree,

        manual_commission_id: record.manual_commission_id || null,
        manual_commission_amount: record.manual_commission_amount
          ? parseFloat(record.manual_commission_amount)
          : null,
        manual_commission_date: record.manual_commission_date || null,
        manual_commission_notes: record.manual_commission_notes || null,

        general_advance_id: record.general_advance_id || null,
        general_advance_remaining:
          record.general_advance_remaining !== null
            ? parseFloat(record.general_advance_remaining)
            : null,
      });

      return acc;
    }, {});

    const grouped = Object.values(groupedMap)
      .map((order) => {
        const treeStr = order.broker_commissions[0]?.tree || "";
        const treeOrder = treeStr.split("->").map((id) => parseInt(id.trim()));

        order.broker_commissions.sort((a, b) => {
          const posA = treeOrder.indexOf(a.broker_id);
          const posB = treeOrder.indexOf(b.broker_id);
          return posA - posB;
        });

        return order;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      message: "All brokers commission history fetched successfully.",
      data: grouped || [],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalItems: totalOrders,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching all broker commission history:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = GetAllBrokerCommissionHistory;