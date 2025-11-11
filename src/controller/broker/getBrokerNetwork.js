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

    const whereClause = {
      user_id: user?.ID,
      [Op.or]: [
        { is_seller: true },
        {
          [Op.and]: [{ is_seller: false }, { is_payment_done: true }],
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

    // 2) Order details by order_type → fetch from respective tables
    const myStoreOrderIds = brokerCommissions
      .filter((h) => h.order_type === "my_store")
      .map((h) => h.order_id);
    const apiOrderIds = brokerCommissions
      .filter((h) => h.order_type === "api")
      .map((h) => h.order_id);
    const lpOrderIds = brokerCommissions
      .filter((h) => h.order_type === "landing_page" || h.order_type === "lp_order")
      .map((h) => h.order_id);

    let myStoreOrders = [];
    if (myStoreOrderIds.length) {
      myStoreOrders = await db.MyStoreOrder.findAll({
        where: { id: { [Op.in]: myStoreOrderIds } },
        raw: true,
        include: [
          {
            model: db.Brokers,
            as: "user_broker", // give it a proper alias
            required: false,
            attributes: ["id"],
            on: {
              user_id: { [Op.eq]: db.Sequelize.col("6lwup_my_store_order.user_id") }, // join condition
            },
          },
        ],
      });
    }

    // Note: API orders are stored in MyStoreOrder in this schema
    let apiOrders = [];
    if (apiOrderIds.length) {
      apiOrders = await db.MyStoreOrder.findAll({
        where: { id: { [Op.in]: apiOrderIds } },
        attributes: ["user_id"],
        include: [
          {
            model: db.Brokers,
            as: "user_broker", // give it a proper alias
            required: false,
            attributes: ["id"],
            on: {
              user_id: { [Op.eq]: db.Sequelize.col("6lwup_my_store_order.user_id") }, // join condition
            },
          },
        ],
        raw: true,
      });
    }

    let lpOrders = [];
    if (lpOrderIds.length) {
      lpOrders = await db.LpOrders.findAll({
        where: { id: { [Op.in]: lpOrderIds } },
        attributes: ["user_id"],
        include: [
          {
            model: db.Brokers,
            as: "user_broker", // give it a proper alias
            required: false,
            attributes: ["id"],
            on: {
              user_id: { [Op.eq]: db.Sequelize.col("6lwup_lp_order.user_id") }, // join condition
            },
          },
        ],
        raw: true,
      });
    }

    const commissionMap = {};

    const userBrokerMap = {};

    const allOrders = [...myStoreOrders, ...apiOrders, ...lpOrders];

    allOrders.forEach((o) => {
      if (o.user_id && o["user_broker.id"]) {
        userBrokerMap[o.user_id] = o["user_broker.id"];
      }
    });
    console.log("userBrokerMap= ", userBrokerMap);

    brokerCommissions.forEach((c) => {
      if (!c.tree) return;

      const sellerId = Number(c.tree.split("->")[0]); // first ID is seller broker id
      if (!sellerId) return;

      if (!commissionMap[sellerId]) commissionMap[sellerId] = 0;
      commissionMap[sellerId] += Number(c.commission_amount || 0);
    });

    // Build hierarchy
    const children = buildBrokerTree(allBrokers, currentBroker.id, 2, commissionMap);
    // Response
    const network = {
      broker_id: currentBroker.id,
      user_id: currentBroker.user?.ID || null,
      user_email: currentBroker.user?.user_email || null,
      display_name: currentBroker.user?.display_name || null,
      level: 1,
      commission_amount: commissionMap[currentBroker.id],
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
