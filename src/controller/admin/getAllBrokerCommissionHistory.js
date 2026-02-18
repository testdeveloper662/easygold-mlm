const db = require("../../models");
const { sequelize } = require("../../config/database");

const GetAllBrokerCommissionHistory = async (req, res) => {
  try {
    // Check if is_payment_declined column exists, if not create it
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

    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").replace(/[^0-9]/g, "");

    // Get total count of unique orders
    const [countResult] = await sequelize.query(`
  SELECT COUNT(DISTINCT CONCAT(order_id, '_', order_type)) as total
  FROM broker_commission_histories
  WHERE is_deleted = 0
  ${search ? "AND order_id LIKE :search" : ""}
`, {
      replacements: search ? { search: `%${search}%` } : {},
    });
    const totalOrders = countResult[0]?.total || 0;

    // Get paginated distinct order IDs
    const [orderIds] = await sequelize.query(
      `
  SELECT DISTINCT order_id, order_type
  FROM broker_commission_histories
  WHERE is_deleted = 0
  ${search ? "AND order_id LIKE :search" : ""}
  ORDER BY createdAt DESC
  LIMIT :limit OFFSET :offset
  `,
      {
        replacements: search
          ? { limit, offset, search: `%${search}%` }
          : { limit, offset },
      }
    );

    // If no orders found
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

    // Extract order IDs
    const orderPairs = orderIds.map(row => ({
      order_id: row.order_id,
      order_type: row.order_type
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

    // Fetch commission entries for these specific order IDs (with order_type)
    const [results] = await sequelize.query(
      `
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
    u.user_email
  FROM broker_commission_histories AS bch
  LEFT JOIN 6LWUP_users AS u ON u.ID = bch.user_id
  WHERE bch.is_deleted = 0
  AND (${whereConditions})
  ORDER BY bch.createdAt DESC
`,
      {
        replacements,
      }
    );

    // Group results by order_id
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
      });

      return acc;
    }, {});


    // Convert grouped map to array and sort based on tree structure
    // const grouped = Object.values(groupedMap)
    //   .map((order) => {
    //     const treeStr = order.broker_commissions[0]?.tree || "";
    //     const treeOrder = treeStr.split("->").map((id) => parseInt(id.trim()));

    //     order.broker_commissions.sort((a, b) => {
    //       const posA = treeOrder.indexOf(a.broker_id);
    //       const posB = treeOrder.indexOf(b.broker_id);
    //       return posA - posB;
    //     });

    //     return order;
    //   })
    //   .sort((a, b) => b.order_id - a.order_id);
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
      // ✅ DATE WISE DESC SORT
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
