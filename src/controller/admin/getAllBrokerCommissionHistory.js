const db = require("../../models");
const { sequelize } = require("../../config/database");

const GetAllBrokerCommissionHistory = async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        bch.*, 
        u.user_email
      FROM broker_commission_histories AS bch
      LEFT JOIN 6LWUP_users AS u ON u.ID = bch.user_id
      ORDER BY bch.createdAt DESC
    `);

    return res.status(200).json({
      success: true,
      message: "All brokers commission history fetched successfully.",
      data: results || [],
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
