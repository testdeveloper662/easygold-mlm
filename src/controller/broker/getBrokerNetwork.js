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

const db = require("../../models");

const MAX_LEVEL = 5;

const buildBrokerTree = (brokers, parentId = null, level = 1) => {
  if (level > MAX_LEVEL) return []; // Stop recursion beyond level 5

  return brokers
    .filter((b) => Number(b.parent_id) === Number(parentId))
    .map((b) => {
      const children = buildBrokerTree(brokers, b.id, level + 1);

      return {
        broker_id: b.id,
        user_id: b.user?.ID || null,
        user_email: b.user?.user_email || null,
        display_name: b.user?.display_name || null,
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

    // Find the broker entry for this user
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

    // Build the hierarchy tree (up to 5 levels)
    const children = buildBrokerTree(allBrokers, currentBroker.id, 2);

    // Construct the root broker node
    const network = {
      broker_id: currentBroker.id,
      user_id: currentBroker.user?.ID || null,
      user_email: currentBroker.user?.user_email || null,
      display_name: currentBroker.user?.display_name || null,
      level: 1,
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
