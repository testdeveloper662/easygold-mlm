const db = require("../../models");

// Recursive function to build broker hierarchy
const buildBrokerTree = (brokers, parentId = null, level = 1) => {
  return brokers
    .filter((b) => Number(b.parent_id) === Number(parentId))
    .map((b) => {
      const children = buildBrokerTree(brokers, b.id, level + 1);

      return {
        broker_id: b.id,
        user_id: b.user?.ID || null,
        user_email: b.user?.user_email || null,
        display_name: b.user?.display_name || null,
        referral_code: b.referral_code || null,
        level,
        children,
        children_count: children.length,
      };
    });
};

const GetBrokerNetworkById = async (req, res) => {
  try {
    const { broker_id } = req.params;

    if (!broker_id) {
      return res.status(400).json({
        success: false,
        message: "Broker ID is required in params",
      });
    }

    // Find the target broker by ID
    const targetBroker = await db.Brokers.findOne({
      where: { id: broker_id },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    if (!targetBroker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Fetch all brokers (to build the complete hierarchy)
    const allBrokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    // Build children recursively
    const children = buildBrokerTree(allBrokers, targetBroker.id, 2);

    // Root node structure
    const network = {
      broker_id: targetBroker.id,
      user_id: targetBroker.user?.ID || null,
      user_email: targetBroker.user?.user_email || null,
      display_name: targetBroker.user?.display_name || null,
      referral_code: targetBroker.referral_code || null,
      level: 1,
      children,
      children_count: children.length,
    };

    return res.status(200).json({
      success: true,
      data: {
        broker: {
          broker_id: targetBroker.id,
          user_id: targetBroker.user?.ID || null,
          display_name: targetBroker.user?.display_name || null,
          referral_code: targetBroker.referral_code || null,
          total_direct_children: children.length,
        },
        network,
      },
    });
  } catch (error) {
    console.error("Error fetching broker network by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetBrokerNetworkById;
