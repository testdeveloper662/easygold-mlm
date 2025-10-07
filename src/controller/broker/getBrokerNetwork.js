const db = require("../../models");

const buildBrokerTree = (brokers, parentId = null, level = 1) => {
  return brokers
    .filter((b) => Number(b.parent_id) === Number(parentId))
    .map((b) => {
      const children = buildBrokerTree(brokers, b.id, level + 1);

      return {
        id: b.id.toString(),
        name:
          `${b.user?.first_name || ""} ${b.user?.last_name || ""}`.trim() ||
          "Unnamed Broker",
        email: b.user?.email,
        referralCode: b.referral_code,
        level,
        children,
        childrenCount: children.length,
      };
    });
};

// Controller
const GetBrokerNetwork = async (req, res) => {
  try {
    const { user } = req.user;
    const brokerUserId = user.id;

    // Find current broker entry
    const currentBroker = await db.Brokers.findOne({
      where: { user_id: brokerUserId },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["first_name", "last_name", "email"],
        },
      ],
    });

    if (!currentBroker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Fetch all brokers including user details
    const allBrokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["first_name", "last_name", "email"],
        },
      ],
      raw: false, // Important: get Sequelize instances, not plain objects
    });

    // Build tree starting from current broker's children
    const children = buildBrokerTree(allBrokers, currentBroker.id, 1);

    // Create root node (current broker)
    const network = {
      id: currentBroker.id.toString(),
      name:
        `${currentBroker.user?.first_name || ""} ${
          currentBroker.user?.last_name || ""
        }`.trim() || "Unnamed Broker",
      email: currentBroker.user?.email,
      referralCode: currentBroker.referral_code,
      level: 0, // Root is level 0
      children,
      childrenCount: children.length,
      isCurrentUser: true,
    };

    return res.status(200).json({
      success: true,
      data: {
        broker: {
          id: currentBroker.id,
          name: `${currentBroker.user?.first_name || ""} ${
            currentBroker.user?.last_name || ""
          }`.trim(),
          referralCode: currentBroker.referral_code,
          totalDirectChildren: children.length,
        },
        network,
      },
    });
  } catch (error) {
    console.error("Error fetching broker network:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetBrokerNetwork;
