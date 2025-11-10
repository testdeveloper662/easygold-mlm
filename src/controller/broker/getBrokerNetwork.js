// const db = require("../../models");

// const buildBrokerTree = (brokers, parentId = null, level = 1) => {
//   return brokers
//     .filter((b) => Number(b.parent_id) === Number(parentId))
//     .map((b) => {
//       const children = buildBrokerTree(brokers, b.id, level + 1);

//       return {
//         broker_id: b.id,
//         user_id: b.user?.ID || null,
//         user_email: b.user?.user_email || null,
//         display_name: b.user?.display_name || null,
//         level,
//         children,
//       };
//     });
// };

// const GetBrokerNetwork = async (req, res) => {
//   try {
//     const { user } = req.user;

//     if (!user || !user.ID) {
//       return res.status(400).json({
//         success: false,
//         message: "User information is missing from request",
//       });
//     }

//     // Find the broker entry for this user
//     const currentBroker = await db.Brokers.findOne({
//       where: { user_id: user.ID },
//       include: [
//         {
//           model: db.Users,
//           as: "user",
//           attributes: ["ID", "user_email", "display_name"],
//         },
//       ],
//     });

//     if (!currentBroker) {
//       return res.status(404).json({
//         success: false,
//         message: "Broker not found",
//       });
//     }

//     // Fetch all brokers with user details
//     const allBrokers = await db.Brokers.findAll({
//       include: [
//         {
//           model: db.Users,
//           as: "user",
//           attributes: ["ID", "user_email", "display_name"],
//         },
//       ],
//     });

//     // Build the hierarchy tree
//     const children = buildBrokerTree(allBrokers, currentBroker.id, 2);

//     // Construct the root broker node
//     const network = {
//       broker_id: currentBroker.id,
//       user_id: currentBroker.user?.ID || null,
//       user_email: currentBroker.user?.user_email || null,
//       display_name: currentBroker.user?.display_name || null,
//       level: 1,
//       children,
//     };

//     return res.status(200).json({
//       success: true,
//       data: network,
//     });
//   } catch (error) {
//     console.error("Error fetching broker network:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };

// module.exports = GetBrokerNetwork;

const { Op } = require("sequelize");
const db = require("../../models");

const MAX_LEVEL = 5;

const buildBrokerTree = (brokers, parentId = null, level = 1, commissionMap = {}) => {
  if (level > MAX_LEVEL) return [];

  return brokers
    .filter((b) => Number(b.parent_id) === Number(parentId))
    .map((b) => {
      const children = buildBrokerTree(brokers, b.id, level + 1, commissionMap);
      const commissionAmount = commissionMap[b.user?.ID] || 0;

      return {
        broker_id: b.id,
        user_id: b.user?.ID || null,
        user_email: b.user?.user_email || null,
        display_name: b.user?.display_name || null,
        commission_amount: commissionAmount,
        level,
        children,
      };
    });
};

const GetBrokerNetwork = async (req, res) => {
  try {
    const { user } = req.user;

    if (!user || !user.ID) {
      return res.status(400).json({
        success: false,
        message: "User information is missing from request",
      });
    }

    // Find current broker
    const currentBroker = await db.Brokers.findOne({
      where: { user_id: user.ID },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    if (!currentBroker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Fetch all brokers with user details
    const allBrokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    // Get all commission records earned by this broker (join users to get email)
    const brokerCommissions = await db.BrokerCommissionHistory.findAll({
      where: { broker_id: currentBroker.id },
      include: [
        {
          model: db.Users,
          as: "commission_from_user",
          attributes: ["user_email"],
        },
      ],
      attributes: [
        "commission_amount",
        "is_seller",
      ],
      raw: true,
    });
    console.log("brokerCommissions= ", brokerCommissions);

    const commissionMap = {};
    let selfCommissionAmount = 0;

    brokerCommissions.forEach((record) => {
      const amount = parseFloat(record["commission_amount"] || 0);
      const userId = record["user_id"]; // <-- use user_id instead of email

      if (record["is_seller"]) {
        selfCommissionAmount += amount;
      } else if (userId) {
        if (!commissionMap[userId]) commissionMap[userId] = 0;
        commissionMap[userId] += amount;
      }
    });

    // Build hierarchy
    const children = buildBrokerTree(allBrokers, currentBroker.id, 2, commissionMap);

    // Calculate totals
    const totalFromChildren = Object.values(commissionMap).reduce((a, b) => a + b, 0);
    const totalCommission = totalFromChildren + selfCommissionAmount;

    // Response
    const network = {
      broker_id: currentBroker.id,
      user_id: currentBroker.user?.ID || null,
      user_email: currentBroker.user?.user_email || null,
      display_name: currentBroker.user?.display_name || null,
      level: 1,
      self_commission_amount: selfCommissionAmount,
      total_commission_amount: totalCommission,
      children,
    };

    return res.status(200).json({
      success: true,
      data: network,
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
