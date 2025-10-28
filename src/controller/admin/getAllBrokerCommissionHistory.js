// const db = require("../../models");
// const { sequelize } = require("../../config/database");

// const GetAllBrokerCommissionHistory = async (req, res) => {
//   try {
//     const [results] = await sequelize.query(`
//       SELECT
//         bch.*,
//         u.user_email
//       FROM broker_commission_histories AS bch
//       LEFT JOIN 6LWUP_users AS u ON u.ID = bch.user_id
//       ORDER BY bch.createdAt DESC
//     `);

//     return res.status(200).json({
//       success: true,
//       message: "All brokers commission history fetched successfully.",
//       data: results || [],
//     });
//   } catch (error) {
//     console.error("Error fetching all broker commission history:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };

// module.exports = GetAllBrokerCommissionHistory;

const db = require("../../models");
const { sequelize } = require("../../config/database");

const GetAllBrokerCommissionHistory = async (req, res) => {
  try {
    // Fetch all commission entries joined with user emails
    const [results] = await sequelize.query(`
      SELECT 
        bch.id,
        bch.order_id,
        bch.order_amount,
        bch.profit_amount,
        bch.broker_id,
        bch.user_id,
        bch.commission_percent,
        bch.commission_amount,
        bch.is_seller,
        bch.is_payment_done,
        bch.createdAt,
        bch.updatedAt,
        u.user_email
      FROM broker_commission_histories AS bch
      LEFT JOIN 6LWUP_users AS u ON u.ID = bch.user_id
      ORDER BY bch.createdAt DESC
    `);

    // Group by order_id
    const groupedMap = results.reduce((acc, record) => {
      const orderId = record.order_id;

      if (!acc[orderId]) {
        acc[orderId] = {
          order_id: orderId,
          order_amount: record.order_amount,
          profit_amount: record.profit_amount,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          broker_commissions: [],
        };
      }

      acc[orderId].broker_commissions.push({
        broker_id: record.broker_id,
        user_id: record.user_id,
        user_email: record.user_email,
        commission_percent: record.commission_percent,
        commission_amount: record.commission_amount,
        is_seller: record.is_seller,
        is_payment_done: record.is_payment_done,
      });

      return acc;
    }, {});

    // Convert to array and ensure:
    // 1️⃣ Seller (is_seller = true) is always first
    // 2️⃣ Orders are sorted by latest order_id DESC
    const grouped = Object.values(groupedMap)
      .map((order) => {
        order.broker_commissions.sort((a, b) => b.is_seller - a.is_seller);
        return order;
      })
      .sort((a, b) => b.order_id - a.order_id); // ✅ latest order first

    return res.status(200).json({
      success: true,
      message: "All brokers commission history fetched successfully.",
      data: grouped || [],
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
