const db = require("../../models");

const GetTargetCustomerStatsOverall = async (req, res) => {
  try {
    const { user } = req.user;

    // Only SUPER_ADMIN can access
    if (user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can view overall statistics.",
      });
    }

    // Get total customers across all brokers
    const totalCustomers = await db.TargetCustomers.count();

    // Get active customers
    const activeCustomers = await db.TargetCustomers.count({
      where: { is_active: true },
    });

    // Get customers by status
    const statusCounts = await db.TargetCustomers.findAll({
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Get customers by interest level
    const interestLevelCounts = await db.TargetCustomers.findAll({
      attributes: [
        "interest_level",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
      ],
      group: ["interest_level"],
      raw: true,
    });

    // Get total estimated value
    const totalEstimatedValue = await db.TargetCustomers.sum("estimated_value");

    // Get customers added this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const customersThisMonth = await db.TargetCustomers.count({
      where: {
        createdAt: {
          [db.Sequelize.Op.gte]: startOfMonth,
        },
      },
    });

    // Get top brokers by customer count
    const topBrokers = await db.TargetCustomers.findAll({
      attributes: [
        "broker_id",
        [db.sequelize.fn("COUNT", db.sequelize.col("target_customers.id")), "customer_count"],
      ],
      include: [
        {
          model: db.Brokers,
          as: "broker",
          attributes: ["id", "user_id", "referral_code"],
          include: [
            {
              model: db.Users,
              as: "user",
              attributes: ["ID", "user_email", "display_name"],
            },
          ],
        },
      ],
      group: ["broker_id"],
      order: [[db.sequelize.fn("COUNT", db.sequelize.col("target_customers.id")), "DESC"]],
      limit: 10,
      raw: false,
    });

    // Get total number of brokers with target customers
    const brokersWithCustomers = await db.TargetCustomers.findAll({
      attributes: [[db.sequelize.fn("COUNT", db.sequelize.fn("DISTINCT", db.sequelize.col("broker_id"))), "count"]],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      message: "Overall target customer statistics retrieved successfully",
      data: {
        total_customers: totalCustomers,
        active_customers: activeCustomers,
        inactive_customers: totalCustomers - activeCustomers,
        status_breakdown: statusCounts,
        interest_level_breakdown: interestLevelCounts,
        total_estimated_value: totalEstimatedValue || 0,
        customers_added_this_month: customersThisMonth,
        brokers_with_customers: brokersWithCustomers[0]?.count || 0,
        top_brokers: topBrokers,
      },
    });
  } catch (error) {
    console.error("Error fetching overall target customer stats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomerStatsOverall;

