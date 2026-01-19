const { Op } = require("sequelize");
const db = require("../../models");
const { roundToTwoDecimalPlaces, generateImageUrl } = require("../../utils/Helper");

const MAX_LEVEL = 5;

// const buildBrokerTree = (brokers, parentId = null, level = 1, commissionMap = {}) => {
//   if (level > MAX_LEVEL) return [];

//   return brokers
//     .filter((b) => Number(b.parent_id) === Number(parentId))
//     .map((b) => {
//       const children = buildBrokerTree(brokers, b.id, level + 1, commissionMap);
//       const commissionAmount = commissionMap[b.id] || 0;

//       return {
//         broker_id: b.id,
//         user_id: b.user?.ID || null,
//         profile_image: generateImageUrl(b.profile_image, "profile"),
//         user_email: b.user?.user_email || null,
//         display_name: b.user?.display_name || null,
//         referral_code: b.referral_code || null,
//         commission_amount: commissionAmount,
//         level,
//         children,
//         children_count: children.length,
//       };
//     });
// };
const buildBrokerTree = async (brokers, parentId = null, level = 1, commissionMap = {}) => {
  if (level > MAX_LEVEL) return [];

  const filtered = brokers.filter(
    (b) => Number(b.parent_id) === Number(parentId)
  );

  const result = await Promise.all(
    filtered.map(async (b) => {
      const children = await buildBrokerTree(
        brokers,
        b.id,
        level + 1,
        commissionMap
      );

      const commissionAmount = roundToTwoDecimalPlaces(commissionMap[b.id] || 0);

      return {
        broker_id: b.id,
        user_id: b.user?.ID || null,
        profile_image: await generateImageUrl(b.profile_image, "profile"),
        user_email: b.user?.user_email || null,
        display_name: b.user?.display_name || null,
        referral_code: b.referral_code || null,
        commission_amount: commissionAmount,
        level,
        children,
        children_count: children.length,
      };
    })
  );

  return result;
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

    // 1️⃣ Find target broker
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

    // 2️⃣ Fetch all brokers with user details
    const allBrokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    // 3️⃣ Get commission history for this broker
    const whereClause = {
      user_id: targetBroker.user?.ID,
      is_deleted: false,
      [Op.or]: [
        { is_seller: true },
        { [Op.and]: [{ is_seller: false }, { is_payment_done: true }] },
      ],
    };

    const brokerCommissions = await db.BrokerCommissionHistory.findAll({
      where: whereClause,
      include: [
        {
          model: db.Users,
          as: "commission_from_user",
          attributes: ["ID", "user_nicename", "user_login", "user_email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    const commissionMap = {};

    brokerCommissions.forEach((c) => {
      if (!c.tree) return;
      const sellerId = Number(c.tree.split("->")[0]); // first ID is seller broker
      if (!sellerId) return;
      if (!commissionMap[sellerId]) commissionMap[sellerId] = 0;
      commissionMap[sellerId] += Number(c.commission_amount || 0);
    });

    // 7️⃣ Build full tree
    const children = await buildBrokerTree(allBrokers, targetBroker.id, 2, commissionMap);

    // 8️⃣ Final network object
    const network = {
      broker_id: targetBroker.id,
      profile_image: await generateImageUrl(targetBroker.profile_image, "profile"),
      user_id: targetBroker.user?.ID || null,
      user_email: targetBroker.user?.user_email || null,
      display_name: targetBroker.user?.display_name || null,
      referral_code: targetBroker.referral_code || null,
      commission_amount: commissionMap[targetBroker.id] ? roundToTwoDecimalPlaces(commissionMap[targetBroker.id]) : 0,
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
