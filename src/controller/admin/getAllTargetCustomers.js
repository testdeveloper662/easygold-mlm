const db = require("../../models");
const { Op } = require("sequelize");

const GetAllTargetCustomers = async (req, res) => {
  try {
    const { user } = req.user;

    if (user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can view all target customers.",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const broker_id = req.query.broker_id || "";

    const whereClause = {};

    // ✅ GLOBAL SEARCH (customer + broker + user)
    if (search) {
      whereClause[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_email: { [Op.like]: `%${search}%` } },

        // 🔥 IMPORTANT: use $alias.field$
        { "$broker.referral_code$": { [Op.like]: `%${search}%` } },
        { "$broker.user.user_email$": { [Op.like]: `%${search}%` } },
        { "$broker.user.display_name$": { [Op.like]: `%${search}%` } },
      ];
    }

    if (broker_id) {
      whereClause.broker_id = broker_id;
    }

    const includeConfig = [
      {
        model: db.Brokers,
        as: "broker",
        attributes: ["id", "user_id", "referral_code"],
        required: false,
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
            required: false,
          },
        ],
      },
    ];

    // ✅ FIXED COUNT QUERY
    const totalCount = await db.TargetCustomers.count({
      where: whereClause,
      include: includeConfig,   // 🔥 REQUIRED
      distinct: true,           // 🔥 REQUIRED
    });

    // ✅ MAIN QUERY
    const targetCustomers = await db.TargetCustomers.findAll({
      where: whereClause,
      include: includeConfig,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      subQuery: false, // 🔥 IMPORTANT for nested search
    });

    return res.status(200).json({
      success: true,
      message: "All target customers retrieved successfully",
      data: {
        customers: targetCustomers,
        total: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit,
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