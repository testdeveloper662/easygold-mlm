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
const buildBrokerTree = async (nodes, parentNode, level = 1, commissionMap = {}, assignedUserIds = new Set()) => {
  if (level > MAX_LEVEL || !parentNode) return [];

  const parentId = parentNode.id;
  const parentRefCode = (parentNode.referral_code || "").trim().toUpperCase();
  const parentUserId = parentNode.user_id || parentNode.user?.ID;
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

  // Mark all matched children as assigned before recursion
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
      const bRoleId = b.user?.role_id || b.role_id || (b.is_affiliate ? 3 : 2);
      let roleName = "BROKER";
      if (bRoleId === 5) roleName = "CUSTOMER";
      else if (bRoleId === 3 || b.is_affiliate) roleName = "AFFILIATE";
      else if (bRoleId === 2) roleName = "BROKER";

      return {
        broker_id: b.id,
        user_id: b.user?.ID || b.user_id || null,
        profile_image: await generateImageUrl(b.profile_image, "profile"),
        user_email: b.user?.user_email || null,
        display_name: b.user?.display_name || null,
        referral_code: b.referral_code || null,
        role_id: bRoleId,
        role_name: roleName,
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


const checkIsDownline = (nodes, parentNode, targetNode, visited = new Set()) => {
  const parentId = parentNode.id;
  const parentRefCode = (parentNode.referral_code || "").trim().toUpperCase();
  const parentUserId = parentNode.user_id || parentNode.user?.ID;
  const isParentAffiliate = Boolean(parentNode.is_affiliate !== undefined ? parentNode.is_affiliate : parentNode.dataValues?.is_affiliate);

  if (parentUserId) visited.add(Number(parentUserId));

  const filtered = nodes.filter((b) => {
    const bUserId = b.user_id || b.user?.ID;
    if (!bUserId || Number(bUserId) === Number(parentUserId)) return false;
    if (visited.has(Number(bUserId))) return false;

    const bRefCode = (b.referred_by_code || "").trim().toUpperCase();
    if (parentRefCode && bRefCode) {
      return bRefCode === parentRefCode;
    }

    if (parentId && b.parent_id && Number(b.parent_id) === Number(parentId)) {
      const isChildAffiliate = Boolean(b.is_affiliate);
      return isChildAffiliate === isParentAffiliate;
    }

    return false;
  });

  for (const child of filtered) {
    if (Number(child.id) === Number(targetNode.id) && Number(child.user_id) === Number(targetNode.user_id)) {
      return true;
    }
    if (checkIsDownline(nodes, child, targetNode, visited)) {
      return true;
    }
  }
  return false;
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

    const type = req.query.type || (req.query.is_affiliate === "true" ? "affiliate" : null);

    let targetBroker = null;
    let isAffiliateNode = false;

    if (type === "affiliate") {
      if (db.Affiliates) {
        targetBroker = await db.Affiliates.findOne({
          where: { [Op.or]: [{ id: broker_id }, { user_id: broker_id }] },
          include: [
            {
              model: db.Users,
              as: "user",
              attributes: ["ID", "user_email", "display_name"],
            },
          ],
        });
        if (targetBroker) isAffiliateNode = true;
      }
    } else if (type === "broker") {
      targetBroker = await db.Brokers.findOne({
        where: { [Op.or]: [{ id: broker_id }, { user_id: broker_id }] },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
          },
        ],
      });
      if (targetBroker) isAffiliateNode = false;
    }

    if (!targetBroker) {
      targetBroker = await db.Brokers.findOne({
        where: { [Op.or]: [{ id: broker_id }, { user_id: broker_id }] },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
          },
        ],
      });
      if (targetBroker) {
        isAffiliateNode = false;
      } else if (db.Affiliates) {
        targetBroker = await db.Affiliates.findOne({
          where: { [Op.or]: [{ id: broker_id }, { user_id: broker_id }] },
          include: [
            {
              model: db.Users,
              as: "user",
              attributes: ["ID", "user_email", "display_name"],
            },
          ],
        });
        if (targetBroker) isAffiliateNode = true;
      }
    }

    if (!targetBroker) {
      return res.status(404).json({
        success: false,
        message: "Broker or Affiliate not found",
      });
    }

    // Determine requested role_id filter parameter
    const rawRoleId = req.query.role_id || req.query.role;
    let filterRoleId = null;
    if (rawRoleId) {
      if (rawRoleId === "all" || rawRoleId === "ALL") {
        filterRoleId = "all";
      } else if (rawRoleId === "CUSTOMER" || rawRoleId === "customer" || String(rawRoleId) === "5") {
        filterRoleId = 5;
      } else if (rawRoleId === "AFFILIATE" || rawRoleId === "affiliate" || String(rawRoleId) === "3") {
        filterRoleId = 3;
      } else if (rawRoleId === "BROKER" || rawRoleId === "broker" || String(rawRoleId) === "2") {
        filterRoleId = 2;
      } else if (!isNaN(parseInt(rawRoleId))) {
        filterRoleId = parseInt(rawRoleId);
      }
    }

    // Private individuals (role_id 4) belong to the affiliate network only and must never appear in the broker network.
    const isAffiliateNetwork = isAffiliateNode || type === "affiliate";
    const defaultRoleWhere = isAffiliateNetwork
      ? { [Op.or]: [{ role_id: { [Op.notIn]: [5] } }, { role_id: null }] }
      : { [Op.or]: [{ role_id: { [Op.notIn]: [4, 5] } }, { role_id: null }] };

    const brokerUserWhere = (filterRoleId === 5)
      ? { role_id: 5 }
      : (filterRoleId && filterRoleId !== "all"
          ? { role_id: filterRoleId }
          : defaultRoleWhere);

    // 2️⃣ Fetch all brokers and affiliates with user details for network tree
    let brokersFormatted = [];
    if (!isAffiliateNode) {
      const brokersRaw = await db.Brokers.findAll({
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name", "role_id"],
            where: brokerUserWhere,
            required: true,
          },
        ],
      });
      brokersFormatted = brokersRaw.map((b) => ({ ...b.toJSON(), is_affiliate: false }));
    }

    let affiliatesFormatted = [];
    if (isAffiliateNode && db.Affiliates) {
      const affiliatesRaw = await db.Affiliates.findAll({
        where: { parent_id: { [Op.not]: null } },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name", "user_status", "role_id"],
            where: {
              [Op.and]: [
                brokerUserWhere,
                {
                  [Op.or]: [
                    { role_id: { [Op.or]: [{ [Op.ne]: 2 }, { [Op.is]: null }] } },
                    { role_id: 2, user_status: 0 }
                  ]
                }
              ]
            },
            required: true,
          },
        ],
      });
      affiliatesFormatted = affiliatesRaw.map((a) => ({ ...a.toJSON(), is_affiliate: true }));
    }

    // Fetch customer users (role_id = 5) only when explicitly requested.
    // The default network tree shows brokers/affiliates/private individuals (role_id 2, 3, 4) and never customers.
    // For Affiliate networks, customers are strictly excluded.
    let customerFormatted = [];
    if (!isAffiliateNode && (filterRoleId === 5 || req.query.include_customers === "true")) {
      const customerRefs = await db.UserReferrals.findAll({
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name", "role_id"],
            where: { role_id: 5 },
            required: true,
          },
        ],
      });
      customerFormatted = customerRefs.map(c => ({
        id: `cust_${c.id}`,
        user_id: c.user_id,
        parent_user_id: c.parent_user_id,
        referred_by_code: c.referred_by_code,
        referral_code: c.referral_code,
        user: c.user,
        role_id: 5,
        is_affiliate: false,
      }));
    }

    const brokerUserIds = new Set(brokersFormatted.map((b) => b.user_id));
    const uniqueAffiliates = affiliatesFormatted.filter((a) => !brokerUserIds.has(a.user_id));
    const existingUserIds = new Set([...brokerUserIds, ...uniqueAffiliates.map((a) => a.user_id)]);
    const uniqueCustomers = customerFormatted.filter((c) => !existingUserIds.has(c.user_id));

    // Drop any node whose linked user could not be resolved (e.g. filtered-out customer rows) so the tree never shows "Unknown" placeholders
    const nodesToUse = [...brokersFormatted, ...uniqueAffiliates, ...uniqueCustomers].filter((n) => n.user && (n.user.ID || n.user.id));

    // Authorization check: non-super admin users can only view their own node or downline nodes
    const reqUser = req.user?.user || req.user;
    if (reqUser && reqUser.role !== "SUPER_ADMIN") {
      const loggedInNode = nodesToUse.find((b) => Number(b.user_id) === Number(reqUser.ID));
      if (!loggedInNode) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Broker or Affiliate profile not found for logged-in user.",
        });
      }

      const isSelf = Number(targetBroker.id) === Number(loggedInNode.id) && Number(targetBroker.user_id) === Number(loggedInNode.user_id);
      if (!isSelf) {
        const isDownline = checkIsDownline(nodesToUse, loggedInNode, targetBroker);
        if (!isDownline) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You can only view details within your downline network.",
          });
        }
      }
    }

    // 3️⃣ Get commission history for this broker
    const whereClause = {
      user_id: targetBroker.user?.ID,
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

    // 7️⃣ Build full tree strictly from matching DB table
    const children = await buildBrokerTree(nodesToUse, targetBroker, 2, commissionMap);

    // 8️⃣ Final network object
    const network = {
      broker_id: targetBroker.id,
      profile_image: await generateImageUrl(targetBroker.profile_image, "profile"),
      user_id: targetBroker.user?.ID || null,
      user_email: targetBroker.user?.user_email || null,
      display_name: targetBroker.user?.display_name || null,
      referral_code: targetBroker.referral_code || null,
      commission_amount: (targetBroker.is_affiliate || req.query.type === "affiliate") ? 0 : (commissionMap[targetBroker.id] ? roundToTwoDecimalPlaces(commissionMap[targetBroker.id]) : 0),
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
