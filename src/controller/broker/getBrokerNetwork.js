const { Op } = require("sequelize");
const db = require("../../models");
const { roundToTwoDecimalPlaces, generateImageUrl } = require("../../utils/Helper");

const MAX_LEVEL = 5;

const buildBrokerTree = async (nodes, parentNode, level = 1, commissionMap = {}, assignedUserIds = new Set()) => {
  if (level > MAX_LEVEL || !parentNode) return [];

  const parentId = parentNode.id || parentNode.dataValues?.id;
  const parentRefCode = (parentNode.referral_code || parentNode.dataValues?.referral_code || "").trim().toUpperCase();
  const parentUserId = parentNode.user_id || parentNode.user?.ID || parentNode.dataValues?.user_id;
  const isParentAffiliate = Boolean(parentNode.is_affiliate !== undefined ? parentNode.is_affiliate : parentNode.dataValues?.is_affiliate);

  if (parentUserId) {
    assignedUserIds.add(Number(parentUserId));
  }

  const filtered = nodes.filter((b) => {
    const bUserId = b.user_id || b.user?.ID;
    if (!bUserId || Number(bUserId) === Number(parentUserId)) return false;

    // A single child user must never be connected to multiple parents in the tree
    if (assignedUserIds.has(Number(bUserId))) return false;

    const bRefCode = (b.referred_by_code || "").trim().toUpperCase();
    if (parentRefCode && bRefCode) {
      return bRefCode === parentRefCode;
    }

    // Only fallback to parent_id if referred_by_code is absent, and must match parent table type
    if (parentId && b.parent_id && Number(b.parent_id) === Number(parentId)) {
      const isChildAffiliate = Boolean(b.is_affiliate);
      return isChildAffiliate === isParentAffiliate;
    }

    return false;
  });

  // Mark all matched children as assigned before recursion so sibling nodes cannot claim them
  filtered.forEach((b) => {
    const bUserId = b.user_id || b.user?.ID;
    if (bUserId) assignedUserIds.add(Number(bUserId));
  });

  const result = await Promise.all(
    filtered.map(async (b) => {
      const children = await buildBrokerTree(
        nodes,
        b,
        level + 1,
        commissionMap,
        assignedUserIds
      );

      const commissionAmount = b.is_affiliate ? 0 : roundToTwoDecimalPlaces(commissionMap[b.id] || 0);

      return {
        broker_id: b.id,
        user_id: b.user?.ID || b.user_id || null,
        profile_image: await generateImageUrl(b.profile_image, "profile"),
        user_email: b.user?.user_email || null,
        display_name: b.user?.display_name || null,
        referral_code: b.referral_code || null,
        is_affiliate: b.is_affiliate || false,
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
    const user = req.user?.user || req.user;

    if (!user || (!user.ID && !user.id)) {
      return res.status(400).json({
        success: false,
        message: "User information is missing from request",
      });
    }

    const targetUserId = (user.role === "SUPER_ADMIN" && req.query.viewUserId)
      ? parseInt(req.query.viewUserId)
      : (user.ID || user.id);

    // Find current broker or affiliate node
    let currentBroker = null;
    if (req.query.type === "affiliate" && db.Affiliates) {
      currentBroker = await db.Affiliates.findOne({
        where: { user_id: targetUserId },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
            required: false,
          },
        ],
      });
    }

    if (!currentBroker) {
      currentBroker = await db.Brokers.findOne({
        where: { user_id: targetUserId },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
            required: false,
          },
        ],
      });
    }

    if (!currentBroker && db.Affiliates) {
      currentBroker = await db.Affiliates.findOne({
        where: { user_id: targetUserId },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
            required: false,
          },
        ],
      });
    }

    if (!currentBroker) {
      return res.status(404).json({
        success: false,
        message: "Broker or Affiliate not found",
      });
    }

    // Fetch all brokers and affiliates with user details for the network tree graph
    const brokersRaw = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
          required: false,
        },
      ],
    });
    const brokersFormatted = brokersRaw.map(b => ({ ...b.toJSON(), is_affiliate: false }));

    let affiliatesFormatted = [];
    if (db.Affiliates) {
      const affiliatesRaw = await db.Affiliates.findAll({
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name", "user_status", "role_id"],
            required: false,
          },
        ],
      });
      affiliatesFormatted = affiliatesRaw.map(a => ({ ...a.toJSON(), is_affiliate: true }));
    }

    // Merge brokers and affiliates avoiding duplicate user records
    const brokerUserIds = new Set(brokersFormatted.map(b => b.user_id));
    const uniqueAffiliates = affiliatesFormatted.filter(a => !brokerUserIds.has(a.user_id));
    const nodesToUse = [...brokersFormatted, ...uniqueAffiliates];

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


    // Build hierarchy using strictly matching database table nodes
    const children = await buildBrokerTree(nodesToUse, currentBroker, 2, commissionMap);
    // Response
    const isAffiliateNode = currentBroker.is_affiliate !== undefined ? Boolean(currentBroker.is_affiliate) : (req.query.type === "affiliate");
    const network = {
      broker_id: currentBroker.id || currentBroker.dataValues?.id,
      user_id: currentBroker.user?.ID || currentBroker.user_id || currentBroker.dataValues?.user_id || null,
      user_email: currentBroker.user?.user_email || null,
      display_name: currentBroker.user?.display_name || null,
      profile_image: await generateImageUrl(currentBroker.profile_image || currentBroker.dataValues?.profile_image, "profile"),
      is_affiliate: isAffiliateNode,
      referral_code: currentBroker.referral_code || currentBroker.dataValues?.referral_code || null,
      level: 1,
      commission_amount: (isAffiliateNode || req.query.type === "affiliate") ? 0 : (commissionMap[currentBroker.id] ? roundToTwoDecimalPlaces(commissionMap[currentBroker.id]) : 0),
      children,
      children_count: children.length,
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
