const db = require("../../models");

const buildBrokerTree = (brokers, parentId = null, level = 1) => {
  return brokers
    .filter((b) => Number(b.parent_id) === Number(parentId))
    .map((b) => {
      const children = buildBrokerTree(brokers, b.id, level + 1);

      return {
        id: b.id.toString(),
        name: b.user?.fullName,
        email: b.user?.email,
        referralCode: b.referral_code,
        level,
        children,
        childrenCount: children.length,
      };
    });
};

const GetBrokerNetworkById = async (req, res) => {
  try {
    const { broker_id } = req.params;

    // Validate param
    if (!broker_id) {
      return res.status(400).json({
        success: false,
        message: "Broker ID is required in params",
      });
    }

    // Find broker entry by ID
    const targetBroker = await db.Brokers.findOne({
      where: { id: broker_id },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["fullName", "email"],
        },
      ],
    });

    if (!targetBroker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Fetch all brokers (to build complete hierarchy)
    const allBrokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["fullName", "email"],
        },
      ],
      raw: false,
    });

    // Build children recursively (reusing same utility function)
    const children = buildBrokerTree(allBrokers, targetBroker.id, 1);

    // Create root node (the requested broker)
    const network = {
      id: targetBroker.id.toString(),
      name: targetBroker.user?.fullName,
      email: targetBroker.user?.email,
      referralCode: targetBroker.referral_code,
      level: 0,
      children,
      childrenCount: children.length,
      isCurrentUser: false, // not necessarily the logged-in one
    };

    return res.status(200).json({
      success: true,
      data: {
        broker: {
          id: targetBroker.id,
          name: targetBroker.user?.fullName,
          referralCode: targetBroker.referral_code,
          totalDirectChildren: children.length,
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
