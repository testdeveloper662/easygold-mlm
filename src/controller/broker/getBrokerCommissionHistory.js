// const db = require("../../models");
// const { Op } = require("sequelize");

// const GetBrokerCommissionHistory = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "user id is required",
//       });
//     }

//     // Fetch commission history ordered from latest to oldest
//     const history = await db.BrokerCommissionHistory.findAll({
//       where: {
//         user_id: id,
//         [Op.or]: [
//           { is_seller: true },
//           {
//             [Op.and]: [{ is_seller: false }, { is_payment_done: true }],
//           },
//         ],
//       },
//       order: [["createdAt", "DESC"]],
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Broker commission history fetched successfully.",
//       data: history || [],
//     });
//   } catch (error) {
//     console.error("Error fetching broker commission history:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error.",
//     });
//   }
// };

// module.exports = GetBrokerCommissionHistory;

const db = require("../../models");
const { Op } = require("sequelize");

const GetBrokerCommissionHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "user id is required",
      });
    }

    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {
      user_id: id,
      [Op.or]: [
        { is_seller: true },
        {
          [Op.and]: [{ is_seller: false }, { is_payment_done: true }],
        },
      ],
    };

    // Get total count
    const totalCount = await db.BrokerCommissionHistory.count({
      where: whereClause,
    });

    // Fetch paginated commission history ordered from latest to oldest
    const history = await db.BrokerCommissionHistory.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    return res.status(200).json({
      success: true,
      message: "Broker commission history fetched successfully.",
      data: history || [],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching broker commission history:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = GetBrokerCommissionHistory;
