const db = require("../../models");
const { Op } = require("sequelize");

const GetBrokersList = async (req, res) => {
  try {
    const whereClause = {};

    // Exclude users whose role is AFFILIATE
    const affiliateMetas = await db.UsersMeta.findAll({
      where: {
        meta_key: "user_role",
        meta_value: "AFFILIATE",
      },
      attributes: ["user_id"],
    });

    const affiliateUserIds = affiliateMetas.map((m) => m.user_id);
    if (affiliateUserIds.length > 0) {
      whereClause.user_id = { [Op.notIn]: affiliateUserIds };
    }

    // Fetch brokers with user details excluding Customers (role_id = 5) and Affiliates
    const brokers = await db.Brokers.findAll({
      where: whereClause,
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["display_name", "user_email", "role_id"],
          where: {
            [Op.or]: [
              { role_id: { [Op.ne]: 5 } },
              { role_id: null },
            ],
          },
          required: true,
        },
      ],
      attributes: ["id", "user_id"],
      order: [["id", "DESC"]],
    });

    // Map to desired structure
    const brokerList = brokers.map((broker) => ({
      broker_id: broker.id,
      user_id: broker.user_id,
      display_name: broker.user?.display_name || "",
      user_email: broker.user?.user_email || "",
    }));

    return res.status(200).json({
      success: true,
      data: brokerList,
    });
  } catch (error) {
    console.error("Error fetching brokers list:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch brokers list",
      error: error.message,
    });
  }
};

module.exports = GetBrokersList;
