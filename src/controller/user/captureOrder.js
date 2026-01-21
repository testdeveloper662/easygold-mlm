const db = require("../../models");

const getNetAmount = (gross, vatPercent) => {
  if (!vatPercent || vatPercent <= 0) return gross;
  return parseFloat((gross / (1 + vatPercent / 100)).toFixed(2));
};

const CaptureOrder = async (req, res) => {
  const startTime = new Date();
  console.log(`\n [CAPTURE ORDER] ==========================================`);
  console.log(` [CAPTURE ORDER] START TIME: ${startTime.toISOString()}`);
  console.log(` [CAPTURE ORDER] ==========================================\n`);

  try {
    // Log request source information
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const referer = req.headers['referer'] || req.headers['referrer'] || 'Direct';
    const origin = req.headers['origin'] || 'Unknown';

    console.log(` [CAPTURE ORDER] Request Source Information:`);
    console.log(`   - Client IP: ${clientIP}`);
    console.log(`   - User Agent: ${userAgent}`);
    console.log(`   - Referer: ${referer}`);
    console.log(`   - Origin: ${origin}`);
    console.log(`   - Method: ${req.method}`);
    console.log(`   - URL: ${req.originalUrl || req.url}`);
    console.log(`   - Request Body:`, req.body ? JSON.stringify(req.body, null, 2) : 'undefined');
    console.log(`   - Content-Type: ${req.headers['content-type'] || 'Not set'}`);

    // Check if req.body exists
    if (!req.body) {
      console.error(` [CAPTURE ORDER] req.body is undefined. Check body parser middleware.`);
      return res.status(400).json({
        success: false,
        message: "Request body is missing. Please ensure Content-Type: application/json header is set.",
      });
    }

    const { orderId, orderType, b2bCommissionAmount, b2bEmail, selected_payment_method } = req.body;

    const existingCommission = await db.BrokerCommissionHistory.findOne({
      where: {
        order_id: orderId,
        order_type: orderType,
      },
    });

    if (existingCommission) {
      console.log(` [CAPTURE ORDER] ⚠️ Commission already exists for Order ID: ${orderId}, Type: ${orderType}`);

      return res.status(200).json({
        success: true,
        message: "Commission already calculated for this order",
        data: {
          orderId,
          orderType,
        },
      });
    }

    const isGoldFlex = orderType == 'goldflex';
    const isEasyGoldToken = orderType == 'easygoldtoken';
    const isGoldPurchase = orderType == 'gold_purchase';
    const isGoldPurchaseSell = orderType == 'gold_purchase_sell_orders';

    console.log(` [CAPTURE ORDER] Request received - orderId: ${orderId}, orderType: ${orderType}`);

    if (!orderId || !orderType) {
      console.error(` [CAPTURE ORDER] Missing required fields - orderId: ${orderId}, orderType: ${orderType}`);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: orderId and orderType",
      });
    } else if ((isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken) && !b2bCommissionAmount) {
      console.error(` [CAPTURE ORDER] Missing required fields - b2bCommissionAmount: ${b2bCommissionAmount}`);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: b2bCommissionAmount",
      });
    }

    // Step 1: 
    let OrderModel, PivotModel;



    if (orderType === "landing_page") {
      OrderModel = db.LpOrders;
      PivotModel = db.LpOrderPivots;
    } else if (orderType === "my_store") {
      OrderModel = db.MyStoreOrder;
      PivotModel = db.MyStoreOrderPivots;
    } else if (orderType === "api") {
      OrderModel = db.MyStoreOrder;
      PivotModel = db.MyStoreOrderPivots;
    } else if (isGoldPurchase) {
      OrderModel = db.GoldPurchaseOrder;
    } else if (isGoldPurchaseSell) {
      OrderModel = db.GoldPurchaseSellOrders;
    } else if (isGoldFlex) {
      console.log(` [CAPTURE ORDER] Gold Flex order type detected.`);
    } else if (isEasyGoldToken) {
      console.log(` [CAPTURE ORDER] Easy Gold Token order type detected.`);
    } else {
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}`,
      });
    }

    let order = null;

    if (!isGoldFlex && !isEasyGoldToken) {
      // Step 2: Get the order
      order = await OrderModel.findOne({ where: { id: orderId } });
      if (!order)
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
    }

    let orderPivots = [];
    let totalProfitAmount = 0;
    let totalOrderAmount = 0;
    let totalCommissionPercent = 0;

    let totalB2BAmount = 0;

    if (!isGoldPurchase && !isGoldPurchaseSell && !isGoldFlex && !isEasyGoldToken) {
      // Step 3: Get the pivot info
      orderPivots = await PivotModel.findAll({
        where: { order_id: orderId },
      });
      // if (!orderPivot)
      //   return res
      //     .status(404)
      //     .json({ success: false, message: "Order pivot not found" });

      // // Step 4: Calculate total commission % and total profit (€)
      // console.log(`\n [CAPTURE ORDER] Order Pivot Details:`);
      // console.log(`   - Price: €${orderPivot.price}`);
      // console.log(`   - B2B Price: €${orderPivot.b2b_price}`);
      // console.log(`   - Quantity: ${orderPivot.quantity}`);

      // totalCommissionPercent =
      //   (orderPivot.price / orderPivot.b2b_price - 1) * 100;
      // totalProfitAmount = (orderPivot.price - orderPivot.b2b_price) * orderPivot.quantity;

      // console.log(` [CAPTURE ORDER] Profit Calculation:`);
      // console.log(`   - Total Commission Percent: ${totalCommissionPercent.toFixed(2)}%`);
      // console.log(`   - Total Profit Amount: €${totalProfitAmount.toFixed(2)}`);
      // console.log(`   - Formula: (${orderPivot.price} - ${orderPivot.b2b_price}) * ${orderPivot.quantity} = ${totalProfitAmount}`);

      // if (totalProfitAmount <= 0) {
      //   console.error(` [CAPTURE ORDER] WARNING: Total Profit Amount is ${totalProfitAmount}. Commission will be 0!`);
      //   console.error(` [CAPTURE ORDER] Check if price (${orderPivot.price}) > b2b_price (${orderPivot.b2b_price})`);
      // }

      console.log(orderPivots, "orderPivots");

      // for (const pivot of orderPivots) {
      //   const productTotal = pivot.price * pivot.quantity;
      //   const productProfit = (pivot.price - pivot.b2b_price) * pivot.quantity;

      //   console.log(`\n [CAPTURE ORDER] Order Pivot Details:`);
      //   console.log(`   - Price: €${pivot.price}`);
      //   console.log(`   - B2B Price: €${pivot.b2b_price}`);
      //   console.log(`   - Quantity: ${pivot.quantity}`);

      //   totalOrderAmount += productTotal;
      //   totalProfitAmount += productProfit;
      // }

      let netB2B = 0;
      let netPrice = 0;

      for (const pivot of orderPivots) {
        const product = await db.Product.findOne({
          where: { id: pivot.product_id },
          attributes: ["VAT"]
        });

        // 1️⃣ Get product VAT
        let vatFromProduct = null;
        let vatFromCountry = 0;
        let vatPercent = 0;

        // 1️⃣ Product VAT
        if (product?.VAT) {
          if (
            typeof product.VAT === "string" &&
            product.VAT.toLowerCase().includes("differenz")
          ) {
            vatFromProduct = "DIFFERENZ";
          } else {
            vatFromProduct = parseFloat(product.VAT.replace("%", "")) || 0;
          }
        }

        // 2️⃣ Country VAT
        const shipping = await db.LpOrderShippingOptions.findOne({
          where: { lp_order_id: orderId, meta_key: "s_country" }
        });

        if (shipping) {
          const countryTax = await db.TaxCountry.findOne({
            where: { Code: shipping.meta_value }
          });
          vatFromCountry = countryTax?.Tax || 0;
        }

        // 3️⃣ Final VAT Selection
        if (vatFromProduct === "DIFFERENZ") {
          vatPercent = vatFromCountry;                       // Differenzbesteuert
        } else if (vatFromProduct === 0) {
          vatPercent = 0;                                   // Gold / VAT-free
        } else if (vatFromProduct !== null) {
          vatPercent = Math.max(vatFromProduct, vatFromCountry); // 19 vs 17 → 19
        } else {
          vatPercent = vatFromCountry;                      // Fallback
        }

        const grossPrice = pivot.price;
        const grossB2B = pivot.b2b_price;

        netPrice = getNetAmount(grossPrice, vatPercent);
        netB2B = getNetAmount(grossB2B, vatPercent);

        const productNetTotal = netPrice * pivot.quantity;
        const productProfit = (netPrice - netB2B) * pivot.quantity;

        console.log(`\n [CAPTURE ORDER] Order Pivot Details:`);
        console.log(`   - Price: €${pivot.price}`);
        console.log(`   - B2B Price: €${pivot.b2b_price}`);
        console.log(`   - Quantity: ${pivot.quantity}`);

        console.log(`\n[VAT CALCULATION]`);
        console.log(`Product ID: ${pivot.product_id}`);
        console.log(`VAT: ${vatPercent}%`);
        console.log(`Gross Price: ${grossPrice} → Net: ${netPrice}`);
        console.log(`Gross B2B: ${grossB2B} → Net: ${netB2B}`);
        console.log(`Net Total: ${productNetTotal}`);
        console.log(`Profit: ${productProfit}`);

        totalOrderAmount += productNetTotal;
        totalProfitAmount += productProfit;

        totalB2BAmount += netB2B * pivot.quantity;
      }

      // Commission percent based on TOTAL values
      // const totalB2BAmount = orderPivots.reduce(
      //   (sum, p) => sum + (p.b2b_price * p.quantity),
      //   0
      // );

      // Already calculated in loop using netB2B

      const totalCommissionPercent =
        totalB2BAmount > 0
          ? ((totalOrderAmount / totalB2BAmount) - 1) * 100
          : 0;

      console.log(` [CAPTURE ORDER] Profit Calculation:`);
      console.log(`   - TOTAL Order Amount: €${totalOrderAmount.toFixed(2)}`);
      console.log(`   - TOTAL B2B Amount: €${totalB2BAmount.toFixed(2)}`);
      console.log(`   - TOTAL Profit Amount: €${totalProfitAmount.toFixed(2)}`);
      console.log(`   - TOTAL Commission Percent: ${totalCommissionPercent.toFixed(2)}%`);
      console.log(`   - Formula: (Total Order / Total B2B - 1) * 100`);

      if (totalProfitAmount <= 0) {
        console.error(` [CAPTURE ORDER] WARNING: Total Profit Amount is ${totalProfitAmount}. Commission will be 0!`);
      }
    }

    let broker = null;
    let targetCustomerBroker = false;

    if (isGoldFlex || isEasyGoldToken) {
      // For Gold Flex, get broker using b2bEmail
      broker = await db.Brokers.findOne({
        include: [
          {
            model: db.Users,
            as: "user",
            where: {
              user_email: b2bEmail,
            },
            attributes: ["ID", "user_email", "display_name"],
          },
        ],
      });

      if (!broker) {
        let interest_in;
        if (orderType == "goldflex") {
          interest_in = "goldflex";
        } else if (orderType == "easygoldtoken") {
          interest_in = "easygold Token";
        }
        let customer = await db.TargetCustomers.findOne({
          where: { customer_email: b2bEmail, interest_in, status: "REGISTERED" },
        });

        if (!customer) {
          return res
            .status(404)
            .json({ success: false, message: "Customer not found" });
        }

        broker = await db.Brokers.findOne({
          where: {
            id: customer.broker_id, // 👈 broker id condition
          },
          include: [
            {
              model: db.Users,
              as: "user",
              attributes: ["ID", "user_email", "display_name"],
            },
          ],
        });
        targetCustomerBroker = true;
      }
    } else {
      // Step 5: Get broker (seller)
      broker = await db.Brokers.findOne({
        where: { user_id: order.user_id },
      });
    }
    if (!broker)
      return res
        .status(404)
        .json({ success: false, message: "Broker not found" });

    // Step 6: Get up to 4 parent brokers
    const parentBrokers = [];
    let currentParentId = broker.parent_id;
    let level = 0;

    let brokerlevel;

    if (isEasyGoldToken || isGoldFlex) {
      brokerlevel = targetCustomerBroker ? 4 : 5;
    } else {
      brokerlevel = 4;
    }

    while (currentParentId && level < brokerlevel) {
      const parent = await db.Brokers.findOne({
        where: { id: currentParentId },
      });
      if (!parent) break;
      parentBrokers.push(parent);
      currentParentId = parent.parent_id;
      level++;
    }

    // Step 7: Map orderType to serviceType for dynamic commission fetching
    const orderTypeToServiceType = {
      landing_page: "Landing page",
      my_store: "My Store",
      api: "Order Terminal",
      gold_purchase: "Gold Purchase",
      gold_purchase_sell_orders: "Gold Purchase",
      goldflex: "GoldFlex",
      easygoldtoken: "Easygold Token"
    };

    const serviceType = orderTypeToServiceType[orderType];
    if (!serviceType) {
      console.error(`❌ [CAPTURE ORDER] Invalid orderType: ${orderType}`);
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}. Must be one of: landing_page, my_store, api, gold_purchase, gold_purchase_sell_orders`,
      });
    }

    console.log(` [CAPTURE ORDER] Fetching variable broker commissions for serviceType: ${serviceType}, orderType: ${orderType}`);

    let commissionRecords;

    if (isGoldFlex || isEasyGoldToken) {
      // For Gold Flex, use fixed commission percentages
      await db.AdminFixedBrokerCommission.sync();
      commissionRecords = await db.AdminFixedBrokerCommission.findAll({
        where: {
          service_type: serviceType,
        },
        order: [["level", "ASC"]],
      });
      console.log(` [CAPTURE ORDER] Found ${commissionRecords.length} fixed commission records for Gold Flex serviceType: ${serviceType}`);
    } else {

      // Step 7.1: Fetch dynamic commission percentages from database (Variable Broker Commissions)
      await db.AdminVariableBrokerCommission.sync();

      commissionRecords = await db.AdminVariableBrokerCommission.findAll({
        where: {
          service_type: serviceType,
        },
        order: [["level", "ASC"]],
      });

      console.log(` [CAPTURE ORDER] Found ${commissionRecords.length} commission records for serviceType: ${serviceType}`);
    }

    console.log(` [CAPTURE ORDER] Commission Records:`, commissionRecords.map(r => ({ level: r.level, percentage: r.percentage })));

    // Extract percentages from database records
    let basePercentages = [];
    if (commissionRecords && commissionRecords.length > 0) {
      basePercentages = commissionRecords.map((record) => record.percentage || 0);
      console.log(` [CAPTURE ORDER] Dynamic percentages from DB: [${basePercentages.join(", ")}]`);
    } else {
      // Fallback to static values if database is empty
      console.warn(` [CAPTURE ORDER] No commission records found in DB for serviceType: ${serviceType}. Using fallback static values.`);
      basePercentages = [50, 20, 15, 10, 5];
      console.log(` [CAPTURE ORDER] Using fallback static percentages: [${basePercentages.join(", ")}]`);
    }

    // brokerlevel = isEasyGoldToken || isGoldFlex ? 6 : 5;
    if (isEasyGoldToken || isGoldFlex) {
      brokerlevel = targetCustomerBroker ? 5 : 6;
    } else {
      brokerlevel = 5;
    }

    // Ensure we have at least 5 levels (pad with 0 if needed)
    while (basePercentages.length < brokerlevel) {
      basePercentages.push(0);
    }

    let activeLevels = [];

    if (isGoldFlex || isEasyGoldToken) {
      activeLevels = targetCustomerBroker
        ? [broker, ...parentBrokers]   // self included
        : [...parentBrokers];          // self skipped
    } else {
      activeLevels = [broker, ...parentBrokers];
    }
    const activeBase = basePercentages.slice(0, activeLevels.length);

    console.log(` [CAPTURE ORDER] Active levels count: ${activeLevels.length}, Active base percentages: [${activeBase.join(", ")}]`);
    console.log(` [CAPTURE ORDER] Broker Hierarchy: Level 1 (Seller) + ${parentBrokers.length} Parent(s)`);

    // Distribute remaining percent to level 1 (seller)
    const totalBase = activeBase.reduce((a, b) => a + b, 0);
    const remaining = 100 - totalBase;

    if (!isGoldFlex && !isEasyGoldToken) {
      activeBase[0] += remaining;
    }

    console.log(`[CAPTURE ORDER] Commission Distribution Logic:`);
    console.log(`   - Total Base Percentages: ${totalBase}%`);
    console.log(`   - Remaining: ${remaining}%`);
    console.log(`   - Adjusted Level 1 (Seller): ${activeBase[0]}% (original: ${basePercentages[0]}% + remaining: ${remaining}%)`);
    console.log(`   - Level 2: ${activeBase[1] || 0}%`);
    console.log(`   - Level 3: ${activeBase[2] || 0}%`);
    console.log(`   - Level 4: ${activeBase[3] || 0}%`);
    console.log(`   - Level 5: ${activeBase[4] || 0}%`);

    // Normalize
    const normalizedPercents = activeBase.map((p) =>
      parseFloat(((p / 100) * 100).toFixed(2))
    );

    console.log(` [CAPTURE ORDER] Normalized percentages: [${normalizedPercents.join(", ")}]`);

    // Step 8: Build tree string (e.g., "1->2->3")
    const tree = activeLevels.map((b) => b.id).join("->");

    // Step 9: Calculate and store each broker's commission
    const distribution = [];

    console.log(` [CAPTURE ORDER] Starting commission distribution for ${activeLevels.length} brokers`);

    for (let i = 0; i < activeLevels.length; i++) {
      const currentBroker = activeLevels[i];
      const commissionPercent = normalizedPercents[i];

      console.log(`\n [CAPTURE ORDER] ==========================================`);
      console.log(` [CAPTURE ORDER] Level ${i + 1} Commission Calculation START`);
      console.log(` [CAPTURE ORDER] ==========================================`);
      console.log(` [CAPTURE ORDER] Input Values:`);
      console.log(`   - Broker ID: ${currentBroker.id}`);
      console.log(`   - User ID: ${currentBroker.user_id}`);
      console.log(`   - Commission Percent (raw): ${commissionPercent}`);
      console.log(`   - Commission Percent (type): ${typeof commissionPercent}`);

      // Calculate commission amount with detailed logging
      const rawCalculation = (isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken) ? (commissionPercent / 100) * b2bCommissionAmount : (commissionPercent / 100) * totalProfitAmount;
      console.log(` [CAPTURE ORDER] Calculation Steps:`);
      console.log(`   - Step 1: (${commissionPercent} / 100) = ${commissionPercent / 100}`);
      console.log(`   - Step 2: ${commissionPercent / 100} * ${isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken ? b2bCommissionAmount : totalProfitAmount} = ${rawCalculation}`);
      console.log(`   - Step 3: ${rawCalculation}.toFixed(2) = ${rawCalculation.toFixed(2)}`);

      const commissionAmount = parseFloat(rawCalculation.toFixed(2));
      console.log(`   - Step 4: parseFloat(${rawCalculation.toFixed(2)}) = ${commissionAmount}`);
      console.log(` [CAPTURE ORDER] Final Commission Amount:`);
      console.log(`   - Value: ${commissionAmount}`);
      console.log(`   - Type: ${typeof commissionAmount}`);
      console.log(`   - Is NaN: ${isNaN(commissionAmount)}`);
      console.log(`   - Is Null: ${commissionAmount === null}`);
      console.log(`   - Is Undefined: ${commissionAmount === undefined}`);

      // const isSeller = i === 0;
      const isSeller = i === 0;
      console.log(` [CAPTURE ORDER] Additional Info:`);
      console.log(`   - Is Seller: ${isSeller}`);

      if (commissionAmount <= 0 || isNaN(commissionAmount)) {
        console.error(` [CAPTURE ORDER] ⚠️ WARNING: Commission Amount is ${commissionAmount} for Level ${i + 1}!`);
        console.error(` [CAPTURE ORDER] ⚠️ Check: commissionPercent=${commissionPercent}%, totalProfitAmount=€${isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken ? b2bCommissionAmount : totalProfitAmount}`);
        console.error(` [CAPTURE ORDER] ⚠️ Raw calculation result: ${rawCalculation}`);
      }

      distribution.push({
        level: i + 1,
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount,
        is_seller: isSeller,
      });

      // ✅ Save in BrokerCommissionHistory with order_type and distribution timestamp
      const distributionTimestamp = new Date();
      console.log(`\n [CAPTURE ORDER] ==========================================`);
      console.log(` [CAPTURE ORDER] Preparing Database Save`);
      console.log(` [CAPTURE ORDER] ==========================================`);
      console.log(` [CAPTURE ORDER] All Values Before Save:`);
      console.log(`   - Broker ID: ${currentBroker.id} (type: ${typeof currentBroker.id})`);
      console.log(`   - User ID: ${currentBroker.user_id} (type: ${typeof currentBroker.user_id})`);
      console.log(`   - Order ID: ${orderId} (type: ${typeof orderId})`);
      console.log(`   - Order Type: ${orderType} (type: ${typeof orderType})`);
      console.log(`   - Commission Percent: ${commissionPercent} (type: ${typeof commissionPercent})`);
      console.log(`   - Commission Amount (raw): ${commissionAmount} (type: ${typeof commissionAmount})`);
      if (!isGoldPurchase && !isGoldPurchaseSell && !isGoldFlex && !isEasyGoldToken) {
        console.log(`   - Profit Amount: ${totalProfitAmount} (type: ${typeof totalProfitAmount})`);
        // console.log(`   - Order Amount: ${orderPivot.price * orderPivot.quantity} (type: ${typeof (orderPivot.price * orderPivot.quantity)})`);
      }
      console.log(`   - Is Seller: ${isSeller} (type: ${typeof isSeller})`);
      console.log(`   - Tree: ${tree} (type: ${typeof tree})`);
      console.log(`   - Distribution Timestamp: ${distributionTimestamp.toISOString()}`);

      // Validate commission_amount before saving
      console.log(`\n [CAPTURE ORDER] Validation Checks:`);
      console.log(`   - isNaN(commissionAmount): ${isNaN(commissionAmount)}`);
      console.log(`   - commissionAmount < 0: ${commissionAmount < 0}`);
      console.log(`   - commissionAmount === null: ${commissionAmount === null}`);
      console.log(`   - commissionAmount === undefined: ${commissionAmount === undefined}`);

      if (isNaN(commissionAmount) || commissionAmount < 0) {
        console.error(` [CAPTURE ORDER] ❌ ERROR: Invalid commission_amount: ${commissionAmount}`);
        console.error(` [CAPTURE ORDER] ❌ commissionPercent: ${commissionPercent}, totalProfitAmount: ${isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken ? b2bCommissionAmount : totalProfitAmount}`);
        console.error(` [CAPTURE ORDER] ❌ commissionPercent type: ${typeof commissionPercent}`);
        console.error(` [CAPTURE ORDER] ❌ totalProfitAmount type: ${typeof isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken ? b2bCommissionAmount : totalProfitAmount}`);
      }

      // Calculate safe commission amount
      const safeCommissionAmount = isNaN(commissionAmount) || commissionAmount < 0
        ? 0.00
        : parseFloat(commissionAmount.toFixed(2));

      console.log(`\n [CAPTURE ORDER] Safe Commission Amount Calculation:`);
      console.log(`   - Input: ${commissionAmount}`);
      console.log(`   - Is NaN: ${isNaN(commissionAmount)}`);
      console.log(`   - Is < 0: ${commissionAmount < 0}`);
      console.log(`   - Safe Value: ${safeCommissionAmount}`);
      console.log(`   - Safe Value Type: ${typeof safeCommissionAmount}`);
      console.log(`   - Safe Value Is NaN: ${isNaN(safeCommissionAmount)}`);

      console.log(`order?.selected_payment_method: ${order?.selected_payment_method}`);

      let selected_payment = order?.selected_payment_method || selected_payment_method;

      // Prepare data object for database
      const commissionData = {
        broker_id: currentBroker.id,
        user_id: currentBroker.user_id,
        order_id: orderId,
        order_type: orderType,
        order_amount: isGoldFlex || isEasyGoldToken ? parseFloat(Number(b2bCommissionAmount).toFixed(2)) : isGoldPurchase || isGoldPurchaseSell ? parseFloat((order.confirmed_price).toFixed(2)) : parseFloat(totalOrderAmount.toFixed(2)),
        profit_amount: isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken ? b2bCommissionAmount : parseFloat(totalProfitAmount.toFixed(2)),
        commission_percent: parseFloat(commissionPercent.toFixed(2)),
        commission_amount: safeCommissionAmount,
        tree,
        is_seller: isSeller,
        selected_payment_method: selected_payment || 1, // default to 1 (bank) if not present
      };

      console.log(`\n [CAPTURE ORDER] Database Create Object:`);
      console.log(`   - broker_id: ${commissionData.broker_id} (type: ${typeof commissionData.broker_id})`);
      console.log(`   - user_id: ${commissionData.user_id} (type: ${typeof commissionData.user_id})`);
      console.log(`   - order_id: ${commissionData.order_id} (type: ${typeof commissionData.order_id})`);
      console.log(`   - order_type: ${commissionData.order_type} (type: ${typeof commissionData.order_type})`);
      console.log(`   - order_amount: ${commissionData.order_amount} (type: ${typeof commissionData.order_amount})`);
      console.log(`   - profit_amount: ${commissionData.profit_amount} (type: ${typeof commissionData.profit_amount})`);
      console.log(`   - commission_percent: ${commissionData.commission_percent} (type: ${typeof commissionData.commission_percent})`);
      console.log(`   - commission_amount: ${commissionData.commission_amount} (type: ${typeof commissionData.commission_amount})`);
      console.log(`   - commission_amount is null: ${commissionData.commission_amount === null}`);
      console.log(`   - commission_amount is undefined: ${commissionData.commission_amount === undefined}`);
      console.log(`   - commission_amount is NaN: ${isNaN(commissionData.commission_amount)}`);
      console.log(`   - tree: ${commissionData.tree} (type: ${typeof commissionData.tree})`);
      console.log(`   - is_seller: ${commissionData.is_seller} (type: ${typeof commissionData.is_seller})`);

      console.log(`\n [CAPTURE ORDER] Attempting Database Create...`);

      let commissionRecord;
      try {
        commissionRecord = await db.BrokerCommissionHistory.create(commissionData);
        console.log(` [CAPTURE ORDER] ✅ Database create successful!`);
      } catch (createError) {
        console.error(`\n [CAPTURE ORDER] ❌❌❌ DATABASE CREATE ERROR ❌❌❌`);
        console.error(` [CAPTURE ORDER] Error Type: ${createError.name}`);
        console.error(` [CAPTURE ORDER] Error Message: ${createError.message}`);
        console.error(` [CAPTURE ORDER] Error Stack: ${createError.stack}`);
        if (createError.errors && createError.errors.length > 0) {
          console.error(` [CAPTURE ORDER] Validation Errors:`);
          createError.errors.forEach((err, idx) => {
            console.error(`   ${idx + 1}. Field: ${err.path}`);
            console.error(`      Type: ${err.type}`);
            console.error(`      Message: ${err.message}`);
            console.error(`      Value: ${err.value}`);
            console.error(`      Origin: ${err.origin}`);
          });
        }
        console.error(` [CAPTURE ORDER] Commission Data that failed:`);
        console.error(JSON.stringify(commissionData, null, 2));
        console.error(` [CAPTURE ORDER] ❌❌❌ END ERROR ❌❌❌\n`);
        throw createError; // Re-throw to stop execution
      }

      console.log(`\n [CAPTURE ORDER] ✅ Commission saved successfully!`);
      console.log(` [CAPTURE ORDER] Database Record Details:`);
      console.log(`   - Record ID: ${commissionRecord.id}`);
      console.log(`   - Commission Percent (DB): ${commissionRecord.commission_percent} (type: ${typeof commissionRecord.commission_percent})`);
      console.log(`   - Commission Amount (DB): ${commissionRecord.commission_amount} (type: ${typeof commissionRecord.commission_amount})`);
      console.log(`   - Commission Amount is null: ${commissionRecord.commission_amount === null}`);
      console.log(`   - Commission Amount is undefined: ${commissionRecord.commission_amount === undefined}`);
      console.log(`   - Commission Amount is NaN: ${isNaN(commissionRecord.commission_amount)}`);
      console.log(`   - Profit Amount (DB): ${commissionRecord.profit_amount} (type: ${typeof commissionRecord.profit_amount})`);
      console.log(`   - Order Amount (DB): ${commissionRecord.order_amount} (type: ${typeof commissionRecord.order_amount})`);
      console.log(`   - Created At (DB): ${commissionRecord.createdAt}`);
      console.log(` [CAPTURE ORDER] ==========================================`);
      console.log(` [CAPTURE ORDER] Level ${i + 1} Commission Calculation END`);
      console.log(` [CAPTURE ORDER] ==========================================\n`);

      // Verify saved values
      if (commissionRecord.commission_amount === null || commissionRecord.commission_amount === undefined) {
        console.error(` [CAPTURE ORDER] ⚠️ WARNING: commission_amount is ${commissionRecord.commission_amount} in database!`);
        console.error(` [CAPTURE ORDER] Check: commissionPercent=${commissionPercent}, totalProfitAmount=${totalProfitAmount}`);
      }
      console.log(`   - This commission_percent and commission_amount will be shown in frontend via getAllBrokerCommissionHistory API\n`);

      if (!isEasyGoldToken && !isGoldFlex && i === 0) {
        // ✅ Increment total commission in Brokers table
        await db.Brokers.increment(
          { total_commission_amount: commissionAmount },
          { where: { id: currentBroker.id } }
        );
        console.log(` [CAPTURE ORDER] Updated total commission for broker ID: ${currentBroker.id}`);
      }
    }

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log(`\n✅ [CAPTURE ORDER] ==========================================`);
    console.log(`✅ [CAPTURE ORDER] Commission distribution completed successfully`);
    console.log(`✅ [CAPTURE ORDER] Order ID: ${orderId}`);
    console.log(`✅ [CAPTURE ORDER] Order Type: ${orderType}`);
    console.log(`✅ [CAPTURE ORDER] Service Type: ${serviceType}`);
    console.log(`✅ [CAPTURE ORDER] Total Brokers: ${activeLevels.length}`);
    console.log(`✅ [CAPTURE ORDER] Tree Structure: ${tree}`);
    if (!isGoldPurchase && !isGoldPurchaseSell && !isGoldFlex && !isEasyGoldToken) {
      console.log(`✅ [CAPTURE ORDER] Total Profit Amount: €${totalProfitAmount}`);
      console.log(`✅ [CAPTURE ORDER] Total Commission Percent: ${totalCommissionPercent.toFixed(2)}%`);
    }
    console.log(`✅ [CAPTURE ORDER] Commission Distribution Summary:`);
    distribution.forEach((dist, idx) => {
      console.log(`   Level ${idx + 1}: Broker ${dist.broker_id} → ${dist.commission_percent}% (€${dist.commission_amount})`);
    });
    console.log(`✅ [CAPTURE ORDER] END TIME: ${endTime.toISOString()}`);
    console.log(`✅ [CAPTURE ORDER] DURATION: ${duration}ms`);
    console.log(`✅ [CAPTURE ORDER] ==========================================\n`);

    return res.status(200).json({
      success: true,
      message: "Commission distribution stored successfully",
      data: {
        totalCommissionPercent: isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken ? 100 : parseFloat(totalCommissionPercent.toFixed(2)),
        totalProfitAmount: isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken ? b2bCommissionAmount : parseFloat(totalProfitAmount.toFixed(2)),
        distribution,
        tree,
        timestamp: endTime.toISOString(),
        duration: `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("Error in CaptureOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = CaptureOrder;
