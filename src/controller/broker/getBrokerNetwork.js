const { Op } = require("sequelize");
const db = require("../../models");
const { roundToTwoDecimalPlaces, generateImageUrl } = require("../../utils/Helper");

const MAX_LEVEL = 5;

const buildBrokerTree = async (brokers, parentId = null, level = 1, commissionMap = {}) => {
  if (level > MAX_LEVEL) return [];

  //   const filteredBrokers = brokers.filter((b) => Number(b.parent_id) === Number(parentId));

  //   const childrenPromises = filteredBrokers.map(async (b) => {
  //     const children = await buildBrokerTree(brokers, b.id, level + 1, commissionMap, profileImageMap);
  //     const commissionAmount = commissionMap[b.id] || 0;
  //     const profile_img = profileImageMap[b.id] || "";

  //     return {
  //       broker_id: b.id,
  //       user_id: b.user?.ID || null,
  //       user_email: b.user?.user_email || null,
  //       display_name: b.user?.display_name || null,
  //       profile_img: profile_img,
  //       commission_amount: commissionAmount,
  //       level,
  //       children,
  //     };
  //   });
  //  return Promise.all(childrenPromises);
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

      const commissionAmount = commissionMap[b.id] || 0;

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

const GetBrokerNetwork = async (req, res) => {
  try {
    const { user } = req.user;

    if (!user || !user.ID) {
      return res.status(400).json({
        success: false,
        message: "User information is missing from request",
      });
    }

    const targetUserId = (user.role === "SUPER_ADMIN" && req.query.viewUserId)
      ? parseInt(req.query.viewUserId)
      : user.ID;

    // Find current broker
    const currentBroker = await db.Brokers.findOne({
      where: { user_id: targetUserId },
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

    const whereClause = {
      user_id: targetUserId,
      is_deleted: false,
      [Op.or]: [
        // 👉 Seller Logic
        {
          is_seller: true,
          [Op.or]: [
            {
              selected_payment_method: [1, 2, 3, 4, 5],
              choose_payment_option: [1, 2, 3, 4],
              is_payment_declined: false,
              order_type: {
                [Op.notIn]: [
                  "gold_purchase_sell_orders",
                  "gold_purchase",
                  "goldprice_fixing",
                  "dealer_purchasing",
                  "dealer_purchasing_diamond",
                  "goldflex",
                  "easygoldtoken",
                  "primeinvest",
                ],
              },
            },
            {
              order_type: {
                [Op.in]: [
                  "gold_purchase_sell_orders",
                  "gold_purchase",
                  "goldprice_fixing",
                  "dealer_purchasing",
                  "dealer_purchasing_diamond",
                  "goldflex",
                  "easygoldtoken",
                  "primeinvest",
                ],
              },
              is_payment_done: true,
            }
          ],
        },

        // 👉 Non-Seller Logic
        {
          is_seller: false,
          [Op.or]: [
            {
              is_payment_done: true,
            },
          ],
        },
      ],
    };
    // Fetch paginated commission history ordered from latest to oldest
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
      raw: true
    });

    const commissionMap = {};

    brokerCommissions.forEach((c) => {
      if (!c.tree) return;

      const sellerId = Number(c.tree.split("->")[0]); // first ID is seller broker id
      if (!sellerId) return;

      if (!commissionMap[sellerId]) commissionMap[sellerId] = 0;
      commissionMap[sellerId] += Number(c.commission_amount || 0);
    });


    // Build hierarchy
    const children = await buildBrokerTree(allBrokers, currentBroker.id, 2, commissionMap);
    // Response
    const network = {
      broker_id: currentBroker.id,
      user_id: currentBroker.user?.ID || null,
      user_email: currentBroker.user?.user_email || null,
      display_name: currentBroker.user?.display_name || null,
      profile_image: await generateImageUrl(currentBroker.profile_image),
      level: 1,
      commission_amount: commissionMap[currentBroker.id] ? roundToTwoDecimalPlaces(commissionMap[currentBroker.id]) : 0,
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
