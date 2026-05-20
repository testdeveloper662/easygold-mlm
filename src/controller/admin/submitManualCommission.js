const db = require("../../models");

const SubmitManualCommission = async (req, res) => {
  try {
    const {
      broker_id,
      user_id,
      amount,
      notes,
      order_type,
      selected_payment_method,
      divide_to_whole_tree,
      order_id,
    } = req.body;

    if (!broker_id || !user_id || !amount || !order_type) {
      return res.status(400).json({
        success: false,
        message: "broker_id, user_id, amount and order_type are required",
      });
    }

    const broker = await db.Brokers.findOne({
      where: { id: broker_id },
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // ==========================================
    // GET PARENT BROKERS
    // ==========================================

    const parentBrokers = [];

    let currentParentId = broker.parent_id;
    let level = 0;

    while (currentParentId && level < 5) {
      const parent = await db.Brokers.findOne({
        where: { id: currentParentId },
      });

      if (!parent) {
        break;
      }

      parentBrokers.push(parent);

      currentParentId = parent.parent_id;

      level++;
    }

    // ==========================================
    // COMMISSION SETTINGS
    // ==========================================

    const orderTypeToServiceType = {
      landing_page: "Landing page",
      my_store: "My Store",
      api: "Order Terminal",
      gold_purchase: "Gold Purchase",
      gold_purchase_sell_orders: "Gold Purchase",
      goldflex: "GoldFlex",
      easygoldtoken: "Easygold Token",
      primeinvest: "Prime Invest",
      my_store_self_service: "My Store",
      my_store_self_service_api: "Order Terminal",
      dealer_purchasing: "Dealer Purchasing",
      gold_price_fixation: "Gold Price Fixation",
    };

    const serviceType = orderTypeToServiceType[order_type];

    let commissionRecords = null;
    if (serviceType == "GoldFlex" || serviceType == "Easygold Token" || serviceType == "Prime Invest") {
      commissionRecords = await db.AdminFixedBrokerCommission.findAll({
        where: {
          service_type: serviceType,
        },
        order: [["level", "ASC"]],
      });
    } else {
      commissionRecords = await db.AdminVariableBrokerCommission.findAll({
        where: {
          service_type: serviceType,
        },
        order: [["level", "ASC"]],
      });
    }

    let basePercentages = [];

    if (commissionRecords?.length > 0) {
      basePercentages = commissionRecords.map(
        (item) => item.percentage || 0
      );
    } else {
      basePercentages = [50, 20, 15, 10, 5];
    }

    while (basePercentages.length < 5) {
      basePercentages.push(0);
    }

    // ==========================================
    // DISTRIBUTION TREE
    // ==========================================

    let activeLevels = [];

    if (divide_to_whole_tree) {
      activeLevels = [broker, ...parentBrokers];
    } else {
      activeLevels = [broker];
    }

    const activeBase = basePercentages.slice(
      0,
      activeLevels.length
    );

    const isFixedCommission =
      serviceType === "GoldFlex" ||
      serviceType === "Easygold Token" ||
      serviceType === "Prime Invest";

    if (!isFixedCommission) {
      const totalBase = activeBase.reduce(
        (sum, item) => sum + item,
        0
      );

      const remaining = 100 - totalBase;

      activeBase[0] += remaining;
    }

    const normalizedPercents = activeBase.map((p) =>
      parseFloat(p.toFixed(2))
    );

    const tree = activeLevels
      .map((b) => b.id)
      .join("->");

    // ==========================================
    // DISTRIBUTE COMMISSION
    // ==========================================

    const rowsToInsert = [];
    const distribution = [];

    const generatedOrderId = (
      order_id
        ? `MANUAL_${order_id}`
        : `MANUAL_${Date.now()}_${Math.floor(
          Math.random() * 10000
        )}`
    ).toString();

    for (let i = 0; i < activeLevels.length; i++) {
      const currentBroker = activeLevels[i];

      const commissionPercent =
        normalizedPercents[i];

      const commissionAmount = parseFloat(
        ((commissionPercent / 100) * amount).toFixed(2)
      );

      const isSeller = i === 0;

      distribution.push({
        level: i + 1,
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        is_seller: isSeller,
      });

      rowsToInsert.push({
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        order_id: generatedOrderId,
        order_type,
        order_amount: parseFloat(
          Number(amount).toFixed(2)
        ),
        profit_amount: parseFloat(
          Number(amount).toFixed(2)
        ),
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        tree,
        is_seller: isSeller,
        selected_payment_method:
          selected_payment_method || 1,
        notes,
        commission_type: "manual",
        is_payment_done: true
      });

      // update broker commission
      await db.Brokers.increment(
        {
          total_commission_amount:
            commissionAmount,
        },
        {
          where: {
            id: currentBroker.id,
          },
        }
      );
    }

    // ==========================================
    // SAVE
    // ==========================================

    await db.BrokerCommissionHistory.bulkCreate(
      rowsToInsert
    );

    return res.status(200).json({
      success: true,
      message:
        "Manual commission distributed successfully",
      data: {
        amount,
        distribution,
        tree,
      },
    });
  } catch (error) {
    console.log(
      "SubmitManualCommission Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = SubmitManualCommission;