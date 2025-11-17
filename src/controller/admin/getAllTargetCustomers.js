const db = require("../../models");
const { Op } = require("sequelize");

const GetAllTargetCustomers = async (req, res) => {
  try {
    const { user } = req.user;

    // Only SUPER_ADMIN can access
    if (user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can view all target customers.",
      });
    }

    // Get pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const broker_id = req.query.broker_id || "";

    // Build where clause
    const whereClause = {};

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Add broker filter
    if (broker_id) {
      whereClause.broker_id = broker_id;
    }

    // Get total count
    const totalCount = await db.TargetCustomers.count({
      where: whereClause,
    });

    // Get paginated target customers with broker information
    const targetCustomers = await db.TargetCustomers.findAll({
      where: whereClause,
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
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    return res.status(200).json({
      success: true,
      message: "All target customers retrieved successfully",
      data: {
        customers: targetCustomers,
        total: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching all target customers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetAllTargetCustomers;
