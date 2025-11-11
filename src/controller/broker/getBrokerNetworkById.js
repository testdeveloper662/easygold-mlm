const { Op } = require("sequelize");
const db = require("../../models");

const MAX_LEVEL = 5;

const buildBrokerTree = (brokers, parentId = null, level = 1, commissionMap = {}) => {
  if (level > MAX_LEVEL) return [];

  return brokers
    .filter((b) => Number(b.parent_id) === Number(parentId))
    .map((b) => {
      const children = buildBrokerTree(brokers, b.id, level + 1, commissionMap);
      const commissionAmount = commissionMap[b.id] || 0;

      return {
        broker_id: b.id,
        user_id: b.user?.ID || null,
        user_email: b.user?.user_email || null,
        display_name: b.user?.display_name || null,
        referral_code: b.referral_code || null,
        commission_amount: commissionAmount,
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

    // 4️⃣ Collect orders by type
    const myStoreOrderIds = brokerCommissions
      .filter((h) => h.order_type === "my_store")
      .map((h) => h.order_id);

    const apiOrderIds = brokerCommissions
      .filter((h) => h.order_type === "api")
      .map((h) => h.order_id);

    const lpOrderIds = brokerCommissions
      .filter((h) => ["landing_page", "lp_order"].includes(h.order_type))
      .map((h) => h.order_id);

    // 5️⃣ Fetch all orders
    const fetchOrders = async (model, ids, alias, tableCol) => {
      if (!ids.length) return [];
      return await model.findAll({
        where: { id: { [Op.in]: ids } },
        include: [
          {
            model: db.Brokers,
            as: alias,
            required: false,
            attributes: ["id"],
            on: {
              user_id: { [Op.eq]: db.Sequelize.col(`${tableCol}.user_id`) },
            },
          },
        ],
        raw: true,
      });
    };

    const myStoreOrders = await fetchOrders(db.MyStoreOrder, myStoreOrderIds, "user_broker", "6lwup_my_store_order");
    const apiOrders = await fetchOrders(db.MyStoreOrder, apiOrderIds, "user_broker", "6lwup_my_store_order");
    const lpOrders = await fetchOrders(db.LpOrders, lpOrderIds, "user_broker", "6lwup_lp_order");

    // 6️⃣ Build userBrokerMap + commissionMap
    const userBrokerMap = {};
    const commissionMap = {};

    const allOrders = [...myStoreOrders, ...apiOrders, ...lpOrders];
    allOrders.forEach((o) => {
      if (o.user_id && o["user_broker.id"]) {
        userBrokerMap[o.user_id] = o["user_broker.id"];
      }
    });

    brokerCommissions.forEach((c) => {
      if (!c.tree) return;
      const sellerId = Number(c.tree.split("->")[0]); // first ID is seller broker
      if (!sellerId) return;
      if (!commissionMap[sellerId]) commissionMap[sellerId] = 0;
      commissionMap[sellerId] += Number(c.commission_amount || 0);
    });

    // 7️⃣ Build full tree
    const children = buildBrokerTree(allBrokers, targetBroker.id, 2, commissionMap);

    // 8️⃣ Final network object
    const network = {
      broker_id: targetBroker.id,
      user_id: targetBroker.user?.ID || null,
      user_email: targetBroker.user?.user_email || null,
      display_name: targetBroker.user?.display_name || null,
      referral_code: targetBroker.referral_code || null,
      commission_amount: commissionMap[targetBroker.id] || 0,
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
