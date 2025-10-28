const db = require("../../models");

const GetBrokersList = async (req, res) => {
  try {
    // Fetch brokers with user details
    const brokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["display_name", "user_email"],
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
