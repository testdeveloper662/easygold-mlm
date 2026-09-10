const db = require("../../models");
const { Op } = require("sequelize");

const GetTargetCustomersByBroker = async (req, res) => {
  try {
    const { user } = req.user;

    // Only SUPER_ADMIN can access
    if (user.role !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only admins can view broker's target customers.",
      });
    }

    const { broker_id } = req.params;

    // Verify broker exists
    const broker = await db.Brokers.findOne({
      where: { id: broker_id },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Get pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const interest_level = req.query.interest_level || "";

    // Build where clause
    const whereClause = {
      broker_id: broker_id,
    };

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_email: { [Op.like]: `%${search}%` } },
        { customer_phone: { [Op.like]: `%${search}%` } },
        { customer_company: { [Op.like]: `%${search}%` } },
      ];
    }

    // Add status filter
    if (status) {
      whereClause.status = status;
    }

    // Add interest level filter
    if (interest_level) {
      whereClause.interest_level = interest_level;
    }

    // Get total count
    const totalCount = await db.TargetCustomers.count({
      where: whereClause,
    });

    // Get paginated target customers
    const targetCustomers = await db.TargetCustomers.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    const personName = broker.user?.display_name || "";
    const personEmail = broker.user?.user_email || "";

    const customersWithPerson = targetCustomers.map((c) => {
      const customer = typeof c.toJSON === "function" ? c.toJSON() : { ...c };
      customer.person_name = personName;
      customer.person_email = personEmail;
      customer.broker_name = personName;
      customer.person = {
        name: personName,
        email: personEmail,
        referral_code: customer.referred_by_code || broker.referral_code || null,
      };
      return customer;
    });

    return res.status(200).json({
      success: true,
      message: "Broker's target customers retrieved successfully",
      data: {
        person: {
          name: personName,
          email: personEmail,
          broker_id: broker.id,
          user_id: broker.user_id,
          referral_code: broker.referral_code,
        },
        broker: {
          id: broker.id,
          user_id: broker.user_id,
          user_email: broker.user?.user_email,
          display_name: broker.user?.display_name,
          referral_code: broker.referral_code,
        },
        customers: customersWithPerson,
        total: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching broker's target customers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomersByBroker;

