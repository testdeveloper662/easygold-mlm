const db = require("../../models");
const {
  roundToTwoDecimalPlaces,
  generateImageUrl,
} = require("../../utils/Helper");

const MAX_LEVEL = 5;

const buildBrokerParentTree = async (
  brokersMap,
  broker,
  level = 1,
  commissionMap = {}
) => {
  if (!broker?.parent_id || level > MAX_LEVEL) {
    return [];
  }

  const parentBroker = brokersMap[broker.parent_id];

  if (!parentBroker) {
    return [];
  }

  const parents = await buildBrokerParentTree(
    brokersMap,
    parentBroker,
    level + 1,
    commissionMap
  );

  const commissionAmount = roundToTwoDecimalPlaces(
    commissionMap[parentBroker.id] || 0
  );

  return [
    {
      broker_id: parentBroker.id,
      user_id: parentBroker.user?.ID || null,
      profile_image: await generateImageUrl(
        parentBroker.profile_image,
        "profile"
      ),
      user_email: parentBroker.user?.user_email || null,
      display_name: parentBroker.user?.display_name || null,
      referral_code: parentBroker.referral_code || null,
      commission_amount: commissionAmount,
      level,
      children: parents,
      children_count: parents.length,
    },
  ];
};

const GetBrokerUplineNetworkById = async (req, res) => {
  try {
    const { broker_id } = req.params;

    if (!broker_id) {
      return res.status(400).json({
        success: false,
        message: "Broker ID is required in params",
      });
    }

    // Find broker
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

    // Get all brokers
    const allBrokers = await db.Brokers.findAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
    });

    // Convert to map
    const brokersMap = {};

    allBrokers.forEach((b) => {
      brokersMap[b.id] = b;
    });

    // ==============================
    // COMMISSION MAP
    // ==============================

    const whereClause = {
      is_deleted: false,
      [db.Sequelize.Op.or]: [
        { is_seller: true },
        {
          [db.Sequelize.Op.and]: [
            { is_seller: false },
            { is_payment_done: true },
          ],
        },
      ],
    };

    const brokerCommissions =
      await db.BrokerCommissionHistory.findAll({
        where: whereClause,
        raw: true,
      });

    const commissionMap = {};

    brokerCommissions.forEach((c) => {
      const brokerId = Number(c.broker_id);

      if (isNaN(brokerId)) return;

      if (!commissionMap[brokerId]) {
        commissionMap[brokerId] = 0;
      }

      commissionMap[brokerId] += Number(
        c.commission_amount || 0
      );
    });

    // ==============================
    // BUILD TREE
    // ==============================

    const parents = await buildBrokerParentTree(
      brokersMap,
      targetBroker,
      2,
      commissionMap
    );

    // Final response
    const network = {
      broker_id: targetBroker.id,
      profile_image: await generateImageUrl(
        targetBroker.profile_image,
        "profile"
      ),
      user_id: targetBroker.user?.ID || null,
      user_email: targetBroker.user?.user_email || null,
      display_name: targetBroker.user?.display_name || null,
      referral_code: targetBroker.referral_code || null,
      commission_amount: roundToTwoDecimalPlaces(
        commissionMap[targetBroker.id] || 0
      ),
      level: 1,
      children: parents,
      children_count: parents.length,
    };

    return res.status(200).json({
      success: true,
      data: {
        broker: {
          broker_id: targetBroker.id,
          user_id: targetBroker.user?.ID || null,
          display_name:
            targetBroker.user?.display_name || null,
          referral_code:
            targetBroker.referral_code || null,
          total_direct_children: parents.length,
        },
        network,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching upline network:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

module.exports = GetBrokerUplineNetworkById;