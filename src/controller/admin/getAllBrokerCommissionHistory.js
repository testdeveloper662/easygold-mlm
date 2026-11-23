const db = require("../../models");
const { sequelize } = require("../../config/database");
const { parseNotes, getKontorStatus, resolveKontorOrderNumber } = require("../../utils/kontorReversalLabel");

const GetAllBrokerCommissionHistory = async (req, res) => {
  try {
    const type = req.query.type || req.query.user_type;
    const tableName = "broker_commission_histories";

    // Check if is_payment_declined column exists, if not create it
    const [columnCheck] = await sequelize.query(
      `SHOW COLUMNS FROM ${tableName} LIKE 'is_payment_declined'`
    );

    if (columnCheck.length === 0) {
      console.log(
        `⚠️ is_payment_declined column doesn't exist in ${tableName}. Creating it now...`
      );

      await sequelize.query(`
        ALTER TABLE ${tableName}
        ADD COLUMN is_payment_declined TINYINT(1) NOT NULL DEFAULT 0
        AFTER is_payment_done
      `);

      console.log(
        `✅ is_payment_declined column created successfully in ${tableName}`
      );
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = String(req.query.search || "").trim();

    // ==========================================
    // TOTAL COUNT
    // ==========================================

    const [countResult] = await sequelize.query(
      `
      SELECT COUNT(DISTINCT
        CASE
          WHEN order_id IS NULL OR order_id <= 0 THEN CONCAT('row_', id)
          ELSE CONCAT(order_id, '_', order_type)
        END
      ) as total
      FROM ${tableName}
      WHERE is_deleted = 0
      ${search ? "AND order_id LIKE :search" : ""}
    `,
      {
        replacements: {
          ...(search ? { search: `%${search}%` } : {}),
        },
      }
    );

    const totalOrders = countResult[0]?.total || 0;

    // ==========================================
    // GET DISTINCT ORDERS
    // ==========================================

    const [orderIds] = await sequelize.query(
      `
      SELECT
        MAX(id) as id,
        MAX(order_id) as order_id,
        MAX(order_type) as order_type
      FROM ${tableName}
      WHERE is_deleted = 0
      ${search ? "AND order_id LIKE :search" : ""}
      GROUP BY CASE
        WHEN order_id IS NULL OR order_id <= 0 THEN CONCAT('row_', id)
        ELSE CONCAT(order_id, '_', order_type)
      END
      ORDER BY MAX(createdAt) DESC
      LIMIT :limit OFFSET :offset
    `,
      {
        replacements: {
          limit,
          offset,
          ...(search ? { search: `%${search}%` } : {}),
        },
      }
    );

    // ==========================================
    // EMPTY RESPONSE
    // ==========================================

    if (!orderIds || orderIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All commission history fetched successfully.",
        data: [],
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalItems: totalOrders,
          itemsPerPage: limit,
        },
      });
    }

    // ==========================================
    // BUILD CONDITIONS
    // ==========================================

    const orderPairs = orderIds.map((row) => ({
      id: row.id,
      order_id: row.order_id,
      order_type: row.order_type,
    }));

    // order_id <= 0 is the Kontor "no real order_id" sentinel (captureOrder.js)
    // — treat it like NULL and match the specific row by its own id instead,
    // otherwise every Kontor-sourced row (all order types) would collapse
    // into a single order_id=0 group.
    const whereConditions = orderPairs
      .map((pair, index) => {
        if (pair.order_id === null || pair.order_id <= 0) {
          return `(bch.id = :id_${index})`;
        }

        return `(bch.order_id = :order_id_${index}
          AND bch.order_type = :order_type_${index})`;
      })
      .join(" OR ");

    const replacements = {};

    orderPairs.forEach((pair, index) => {
      if (pair.order_id === null || pair.order_id <= 0) {
        replacements[`id_${index}`] = pair.id;
      } else {
        replacements[`order_id_${index}`] =
          pair.order_id;

        replacements[`order_type_${index}`] =
          pair.order_type;
      }
    });

    // ==========================================
    // FETCH COMMISSION HISTORY
    // ==========================================

    const [results] = await sequelize.query(
      `
      SELECT
        bch.id,
        bch.order_id,
        bch.order_type,
        bch.commission_type,
        bch.order_amount,
        bch.profit_amount,
        bch.broker_id,
        bch.user_id,
        bch.commission_percent,
        bch.commission_amount,
        bch.is_seller,
        bch.is_payment_done,
        bch.is_payment_declined,
        bch.choose_payment_option,
        bch.selected_payment_method,
        bch.tree,
        bch.notes,
        bch.source,
        bch.createdAt,
        bch.updatedAt,
        u.user_email,
        u.role_id

      FROM ${tableName} AS bch

      LEFT JOIN 6LWUP_users AS u
      ON u.ID = bch.user_id

      WHERE bch.is_deleted = 0
      AND (${whereConditions})

      ORDER BY bch.createdAt DESC
    `,
      {
        replacements,
      }
    );

    // ==========================================
    // GROUP DATA
    // ==========================================

    const groupedMap = results.reduce(
      (acc, record) => {
        // order_id <= 0 is the Kontor "no real order_id" sentinel — group
        // those by the row's own id, same rule as the two queries above,
        // so distinct Kontor orders don't collapse into one group here.
        const hasNoRealOrderId = record.order_id === null || record.order_id <= 0;
        const orderKey = hasNoRealOrderId
          ? `row_${record.id}`
          : `${record.order_id}_${record.order_type}`;

        if (!acc[orderKey]) {
          // Every Kontor-sourced row has no real order_id (hardcoded to 0 in
          // captureOrder.js, any order_type) — the actual Kontor order
          // reference lives in notes.order.number instead.
          let order_number = null;
          if (record.source === "kontor" && record.notes) {
            try {
              order_number = JSON.parse(record.notes)?.order?.number || null;
            } catch {
              order_number = null;
            }
          }

          acc[orderKey] = {
            id: record.id,
            order_id: record.order_id,
            order_number,
            order_type: record.order_type,
            order_amount: record.order_amount,
            profit_amount: record.profit_amount,
            notes: record.notes || null,
            source: record.source || null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            broker_commissions: [],
            tree: record.tree,
            commission_type: record.commission_type,
            choose_payment_option: record.choose_payment_option,
            selected_payment_method: record.selected_payment_method,

            payment_type:
              record.selected_payment_method === 1
                ? "Bank Transfer"
                : record.selected_payment_method === 2
                  ? "Crypto Payment"
                  : record.selected_payment_method === 3
                    ? "Cash"
                    : record.selected_payment_method === 4
                      ? "Card"
                      : record.selected_payment_method === 5
                        ? "FLIZPay"
                        : null,
          };
        }

        acc[orderKey].broker_commissions.push({
          broker_id: record.broker_id,
          affiliate_id: record.broker_id,
          user_id: record.user_id,
          user_email: record.user_email,
          user_role_id: record.role_id,

          commission_percent: parseFloat(
            record.commission_percent || 0
          ),

          commission_amount: parseFloat(
            record.commission_amount || 0
          ),

          is_seller: record.is_seller,

          is_payment_done:
            record.is_payment_done,

          is_payment_declined:
            record.is_payment_declined,

          tree: record.tree,
        });

        return acc;
      },
      {}
    );

    // ==========================================
    // SORT TREE
    // ==========================================

    const grouped = Object.values(groupedMap)
      .map((order) => {
        const treeStr =
          order.broker_commissions[0]?.tree || "";

        const treeOrder = treeStr
          .split("->")
          .map((id) => parseInt(id.trim()));

        order.broker_commissions.sort(
          (a, b) => {
            const posA = treeOrder.indexOf(
              a.broker_id
            );

            const posB = treeOrder.indexOf(
              b.broker_id
            );

            return posA - posB;
          }
        );

        return order;
      })

      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );

    // ==========================================
    // REVERSAL / REFUND LABEL
    // ==========================================
    // Only Kontor-sourced orders carry a reversal concept today; the
    // seller's own commission_amount (sign) backstops the notes-based
    // signal for any row written before type:"reversal" existed.
    await Promise.all(
      grouped.map(async (order) => {
        if (order.source !== "kontor") {
          order.is_reversal = false;
          order.status_label = null;
          return;
        }

        const noteData = parseNotes(order.notes);
        const sellerCommission = order.broker_commissions.find((c) => c.is_seller);
        const status = getKontorStatus(
          { commission_amount: sellerCommission?.commission_amount },
          noteData
        );
        order.is_reversal = status.is_reversal;
        order.status_label = status.status_label;
        order.order_number = await resolveKontorOrderNumber(noteData);
      })
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      message: "All commission history fetched successfully.",

      data: grouped || [],

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(
          totalOrders / limit
        ),
        totalItems: totalOrders,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching all commission history:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = GetAllBrokerCommissionHistory;