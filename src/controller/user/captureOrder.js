const db = require("../../models");
const ReferralLogs = db.TargetCustomerReferralLogs;

const getNetAmount = (gross, vatPercent) => {
  if (!vatPercent || vatPercent <= 0) return gross;
  return parseFloat((gross / (1 + vatPercent / 100)).toFixed(2));
};

const getNetBaseFromGross = (gross, vatPercent) => {
  return parseFloat((gross / (1 + vatPercent / 100)).toFixed(2));
};

const getCommissionFromPrices = (sellGross, b2bGross, vatPercent) => {
  const sellNetBase = getNetBaseFromGross(sellGross, vatPercent);
  const b2bNetBase = getNetBaseFromGross(b2bGross, vatPercent);

  return parseFloat((sellNetBase - b2bNetBase).toFixed(2));
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

    const { orderId, orderType, b2bCommissionAmount, selected_payment_method, b2bAddress, b2bName } = req.body;
    let { b2bEmail } = req.body;

    console.log(b2bAddress, "b2bAddress");

    const normalizedOrderId = String(orderId).trim();

    const isDiamondGemstone = orderType == 'diamond_gemstone';

    if (!isDiamondGemstone) {
      const existingCommission = await db.BrokerCommissionHistory.findOne({
        where: {
          order_id: normalizedOrderId,
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
    }

    const isGoldFlex = orderType == 'goldflex';
    const isEasyGoldToken = orderType == 'easygoldtoken';
    const isPrimeInvest = orderType == 'primeinvest';
    const isGoldPurchase = orderType == 'gold_purchase';
    const isGoldPurchaseSell = orderType == 'gold_purchase_sell_orders';
    const isDealerPurchasing = orderType == 'dealer_purchasing';
    const isDealerPurchasingDiamond = orderType == 'dealer_purchasing_diamond';
    const isGoldPriceFixing = orderType == 'goldprice_fixing';

    console.log(` [CAPTURE ORDER] Request received - orderId: ${orderId}, orderType: ${orderType}`);

    if (!orderId || !orderType) {
      console.error(` [CAPTURE ORDER] Missing required fields - orderId: ${orderId}, orderType: ${orderType}`);
      return res.status(400).json({
        success: false,
        message: "Missing required fields: orderId and orderType",
      });
    } else if ((isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken || isPrimeInvest) && !b2bCommissionAmount) {
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
    } else if (isDiamondGemstone) {
      OrderModel = db.DiamondOrder;
      PivotModel = db.DiamondOrderPivot;
      console.log(` [CAPTURE ORDER] Diamond & Gemstone order type detected.`);
    } else if (isGoldPurchase) {
      OrderModel = db.GoldPurchaseOrder;
    } else if (isGoldPurchaseSell) {
      OrderModel = db.GoldPurchaseSellOrders;
    } else if (isGoldFlex) {
      console.log(` [CAPTURE ORDER] Gold Flex order type detected.`);
    } else if (isEasyGoldToken) {
      console.log(` [CAPTURE ORDER] Easy Gold Token order type detected.`);
    } else if (isPrimeInvest) {
      console.log(` [CAPTURE ORDER] Prime Invest order type detected.`);
    } else if (isDealerPurchasing) {
      let productOrder = await db.ProductOrder.findOne({
        where: { id: orderId },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
          },
        ],
      });
      if (!productOrder) {
        return res

          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      b2bEmail = productOrder.user?.user_email;
      console.log(b2bEmail, "b2bEmail extracted for Dealer Purchasing");
      console.log(` [CAPTURE ORDER] Dealer Purchasing order type detected.`);
    } else if (isDealerPurchasingDiamond) {
      let productOrder = await db.ProductOrderDiamond.findOne({
        where: { id: orderId },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
          },
        ],
      });
      if (!productOrder) {
        return res

          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      b2bEmail = productOrder.user?.user_email;
      console.log(b2bEmail, "b2bEmail extracted for Dealer Purchasing");
      console.log(` [CAPTURE ORDER] Dealer Purchasing order type detected.`);
    } else if (isGoldPriceFixing) {
      const order = await db.Order.findOne({
        where: { id: orderId },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name"],
          },
          {
            model: db.ShippingOption,
            as: "shipping_options",
          },
        ],
      });

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }
      b2bEmail = order.user?.user_email;
      console.log(b2bEmail, "b2bEmail extracted for Gold Price Fixing");
      console.log(` [CAPTURE ORDER] Gold Price Fixing order type detected.`);
    } else {
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}`,
      });
    }

    let order = null;

    if (!isGoldFlex && !isEasyGoldToken && !isPrimeInvest && !isGoldPriceFixing && !isDealerPurchasing && !isDealerPurchasingDiamond) {
      // Step 2: Get the order
      order = await OrderModel.findOne({ where: { id: orderId } });
      if (!order)
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
    }

    let orderPivots = [];

    if (!isGoldPurchase && !isGoldPurchaseSell && !isGoldFlex && !isEasyGoldToken && !isPrimeInvest && !isGoldPriceFixing && !isDealerPurchasing && !isDealerPurchasingDiamond) {
      // Step 3: Get the pivot info
      orderPivots = await PivotModel.findAll({
        where: { order_id: orderId },
      });

      console.log(orderPivots, "orderPivots");
    }

    // Diamond & Gemstone orders can mix both product types in a single order.
    // Every other order type is treated as a single "product" group (unchanged behavior).
    const resolveProductType = (pivot) =>
      isDiamondGemstone ? (pivot.product_type || "diamond") : "product";

    let productTypesToProcess = ["product"];

    if (isDiamondGemstone) {
      const productTypesInOrder = [...new Set(orderPivots.map(resolveProductType))];

      const alreadyProcessed = await db.BrokerCommissionHistory.findAll({
        where: { order_id: normalizedOrderId, order_type: orderType },
        attributes: ["product_type"],
      });
      const alreadyProcessedTypes = new Set(alreadyProcessed.map((row) => row.product_type));

      productTypesToProcess = productTypesInOrder.filter((pt) => !alreadyProcessedTypes.has(pt));

      console.log(` [CAPTURE ORDER] Diamond & Gemstone product types in order: [${productTypesInOrder.join(", ")}], already processed: [${[...alreadyProcessedTypes].join(", ")}], to process: [${productTypesToProcess.join(", ")}]`);

      if (productTypesToProcess.length === 0) {
        console.log(` [CAPTURE ORDER] ⚠️ Commission already exists for all product types in Order ID: ${orderId}, Type: ${orderType}`);
        return res.status(200).json({
          success: true,
          message: "Commission already calculated for this order",
          data: {
            orderId,
            orderType,
          },
        });
      }
    }

    let broker = null;
    let targetCustomerBroker = false;
    let targetCustomerLogFound = null;
    let customerInfo = null;

    if (isGoldFlex || isEasyGoldToken || isPrimeInvest || isDealerPurchasing || isGoldPriceFixing || isDealerPurchasingDiamond) {
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

      if (!broker && (isGoldFlex || isEasyGoldToken || isPrimeInvest)) {
        let interest_in;
        if (orderType == "goldflex") {
          interest_in = "goldflex";
        } else if (orderType == "easygoldtoken") {
          interest_in = "easygold Token";
        } else if (orderType == "primeinvest") {
          interest_in = "Primeinvest";
        }
        let customer = await db.TargetCustomers.findOne({
          where: { customer_email: b2bEmail, interest_in, status: "REGISTERED" },
          raw: true,
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

    console.log(targetCustomerLogFound, "targetCustomerLogFound");
    console.log(targetCustomerBroker, "targetCustomerBroker");
    console.log("----------------------------------------------");
    console.log("Investement check");
    console.log("----------------------------------------------");
    console.log(targetCustomerBroker, "targetCustomerBroker");
    console.log("----------------------------------------------");
    if (targetCustomerBroker) {
      let interest_in;

      if (orderType == "goldflex") {
        interest_in = "goldflex";
      } else if (orderType == "easygoldtoken") {
        interest_in = "easygold Token";
      } else if (orderType == "primeinvest") {
        interest_in = "Primeinvest";
      }

      const customer = await db.TargetCustomers.findOne({
        where: {
          customer_email: b2bEmail,
          interest_in,
          status: "REGISTERED",
        },
      });

      customerInfo = customer;

      console.log(customer, "customer");
      console.log(customer.parent_customer_id, "customer.parent_customer_id");

      if (customer && customer.parent_customer_id) {
        const investment = parseFloat(b2bCommissionAmount || 0);

        // ✅ Calculate commission based on rule
        const commission_amount = Math.floor(investment / 5000);

        console.log(b2bAddress, "b2bAddress inside call");

        targetCustomerLogFound = await ReferralLogs.create({
          broker_id: customer.broker_id,
          from_customer_id: customer.parent_customer_id,
          to_customer_id: customer.id,
          type: "INVESTMENT_DONE",
          investment_amount: investment,
          commission_amount, // 🔥 added
          product: interest_in,
          status: "PENDING",
          address: b2bAddress,
          b2bName: b2bName
        });

        console.log("✅ INVESTMENT_DONE log created", {
          investment,
          commission_amount,
          targetCustomerLogFound
        });
      }
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

    if (isEasyGoldToken || isGoldFlex || isPrimeInvest) {
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
      easygoldtoken: "Easygold Token",
      primeinvest: "Prime Invest",
      dealer_purchasing: "Dealer Purchasing",
      dealer_purchasing_diamond: "Dealer Purchasing",
      goldprice_fixing: "Gold Price Fixation",
      diamond_gemstone: "Diamond & Gemstone",
    };

    const serviceType = orderTypeToServiceType[orderType];
    if (!serviceType) {
      console.error(`❌ [CAPTURE ORDER] Invalid orderType: ${orderType}`);
      return res.status(400).json({
        success: false,
        message: `Invalid orderType: ${orderType}. Must be one of: landing_page, my_store, api, gold_purchase, gold_purchase_sell_orders, goldflex, easygoldtoken, primeinvest, dealer_purchasing, dealer_purchasing_diamond, goldprice_fixing, diamond_gemstone`,
      });
    }

    console.log(` [CAPTURE ORDER] Fetching variable broker commissions for serviceType: ${serviceType}, orderType: ${orderType}`);

    let commissionRecords;

    if (isGoldFlex || isEasyGoldToken || isPrimeInvest) {
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
    if (isEasyGoldToken || isGoldFlex || isPrimeInvest) {
      brokerlevel = targetCustomerBroker ? 5 : 6;
    } else {
      brokerlevel = 5;
    }

    // Ensure we have at least 5 levels (pad with 0 if needed)
    while (basePercentages.length < brokerlevel) {
      basePercentages.push(0);
    }

    let activeLevels = [];

    if (isGoldFlex || isEasyGoldToken || isPrimeInvest) {
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

    if (!isGoldFlex && !isEasyGoldToken && !isPrimeInvest) {
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

    // Step 9: Calculate and store each broker's commission — once per product-type group
    // (only Diamond & Gemstone orders can have more than one group; every other
    // order type has exactly one "product" group, so behavior there is unchanged)
    const allRowsToInsert = [];
    const allDistributions = [];
    const groupSummaries = [];

    for (const productType of productTypesToProcess) {
      const groupPivots = isDiamondGemstone
        ? orderPivots.filter((pivot) => resolveProductType(pivot) === productType)
        : orderPivots;

      console.log(`\n [CAPTURE ORDER] ========== Processing product_type group: "${productType}" (${groupPivots.length} pivot rows) ==========`);

      let totalProfitAmount = 0;
      let totalOrderAmount = 0;
      let totalB2BAmount = 0;
      let totalCommissionPercent = 0;

      if (!isGoldPurchase && !isGoldPurchaseSell && !isGoldFlex && !isEasyGoldToken && !isPrimeInvest && !isGoldPriceFixing && !isDealerPurchasing && !isDealerPurchasingDiamond) {
        for (const pivot of groupPivots) {
          if (isDiamondGemstone) {
            // Diamonds/gemstones have no VAT scheme in this system (no VAT/material
            // data on 6lwup_diamonds / 6lwup_gemstones) — treat the stored price/b2b_price
            // as final amounts instead of running them through gross->net VAT conversion.
            const grossPrice = pivot.price;
            const grossB2B = pivot.b2b_price;
            const productNetTotal = grossPrice * pivot.quantity;
            const productProfit = (grossPrice - grossB2B) * pivot.quantity;

            console.log(`\n [CAPTURE ORDER] Diamond/Gemstone Pivot (no VAT deduction):`);
            console.log(`   - Product ID: ${pivot.product_id}, Product Type: ${resolveProductType(pivot)}`);
            console.log(`   - Price: €${grossPrice}, B2B Price: €${grossB2B}, Quantity: ${pivot.quantity}`);
            console.log(`   - Order Total: €${productNetTotal}, Profit: €${productProfit}`);

            totalOrderAmount += productNetTotal;
            totalProfitAmount += productProfit;
            totalB2BAmount += grossB2B * pivot.quantity;
            continue;
          }

          const product = await db.Product.findOne({
            where: { id: pivot.product_id },
            attributes: ["VAT", "material"],
          });

          // 1️⃣ Get product VAT
          let vatFromProduct = 0;
          let vatFromCountry = 0;

          // Product VAT (ignore Differenzbesteuert)
          if (product?.VAT && product.VAT !== "Differenzbesteuert") {
            vatFromProduct = parseFloat(product.VAT.replace("%", "")) || 0;
          }

          let shipping;

          if (orderType === "landing_page") {
            // Country VAT
            shipping = await db.LpOrderShippingOptions.findOne({
              where: { lp_order_id: orderId, meta_key: "s_country" }
            });
          } else if (isDiamondGemstone) {
            // Country VAT
            shipping = await db.DiamondOrderShippingOptions.findOne({
              where: { diamond_order_id: orderId, meta_key: "s_country" }
            });
          } else {
            // Country VAT
            shipping = await db.MyStoreOrderShippingOptions.findOne({
              where: { my_store_order_id: orderId, meta_key: "s_country" }
            });
          }

          if (shipping) {
            const countryTax = await db.TaxCountry.findOne({
              where: { Country_name: shipping.meta_value }
            });
            vatFromCountry = countryTax?.Tax || 0;
          }

          // ✅ Always use the higher VAT
          const isGoldProduct = product?.material?.toLowerCase() === "gold";

          // 4️⃣ Final VAT selection
          let vatPercent;

          if (isGoldProduct) {
            // 🟡 GOLD → Use product VAT ONLY
            vatPercent = vatFromProduct;
          } else {
            // 🔵 Others → Use higher VAT
            vatPercent = Math.max(vatFromProduct, vatFromCountry);
          }

          console.log(`\n [CAPTURE ORDER] VAT Determination:`);
          console.log(`Product ID: ${pivot.product_id}`);
          console.log(`VAT from Product: ${vatFromProduct}%`);
          console.log(`VAT from Country: ${vatFromCountry}%`);
          console.log(`Applied VAT Percent: ${vatPercent}%`);

          let brokerVatFromCountry = 0;

          const brokerShipping = await db.UsersMeta.findOne({
            where: { user_id: order?.user_id, meta_key: "u_country" }
          });

          if (brokerShipping) {
            const countryTax = await db.TaxCountry.findOne({
              where: { Country_name: brokerShipping.meta_value }
            });
            brokerVatFromCountry = countryTax?.Tax || 0;
          }

          // 4️⃣ Final VAT selection
          let brokerVatPercent;

          if (isGoldProduct) {
            // 🟡 GOLD → Use product VAT ONLY
            brokerVatPercent = vatFromProduct;
          } else {
            // 🔵 Others → Use higher VAT
            brokerVatPercent = Math.max(vatFromProduct, brokerVatFromCountry);
          }

          console.log(`\n [CAPTURE ORDER] Broker VAT Determination:`);
          console.log(`Product ID: ${pivot.product_id}`);
          console.log(`VAT from Product: ${vatFromProduct}%`);
          console.log(`VAT from Broker Country: ${brokerVatFromCountry}%`);
          console.log(`Applied Broker VAT Percent: ${brokerVatPercent}%`);

          const grossPrice = pivot.price;
          const grossB2B = pivot.b2b_price;

          const isHomeDeliveryMode = isDiamondGemstone ? order?.delivery_types === 1 : order?.type === 1;

          if (isHomeDeliveryMode) {
            console.log(` [CAPTURE ORDER] Home Delivery Mode detected for Order ID: ${orderId}. Adjusting VAT calculations if necessary.`);
            brokerVatPercent = vatPercent;
          }


          const b2bNetBase = getNetBaseFromGross(grossB2B, brokerVatPercent);
          const sellNetBase = getNetBaseFromGross(grossPrice, vatPercent);

          console.log(`\n [CAPTURE ORDER] Net Base Calculation:`);
          console.log(`   - Gross Price: €${grossPrice}`);
          console.log(`   - Gross B2B: €${grossB2B}`);
          console.log(`   - VAT Percent: ${vatPercent}%`);
          console.log(`   - Sell Net Base: €${sellNetBase}`);
          console.log(`   - B2B Net Base: €${b2bNetBase}`);

          const commissionNet = sellNetBase - b2bNetBase;   // VAT-FREE commission
          const productProfit = commissionNet * pivot.quantity;

          console.log(`\n [CAPTURE ORDER] Commission Calculation:`);
          console.log(`   - Commission Net (per unit): €${commissionNet}`);
          console.log(`   - Product Profit: €${productProfit}`);

          const productNetTotal = sellNetBase * pivot.quantity;

          console.log(`\n [CAPTURE ORDER] Product Total Calculation:`);
          console.log(`   - Product Net Total: €${productNetTotal}`);

          totalOrderAmount += productNetTotal;
          totalProfitAmount += productProfit;
          totalB2BAmount += b2bNetBase * pivot.quantity;

          console.log(`\n [CAPTURE ORDER] Cumulative Totals So Far:`);
          console.log(`   - Total Order Amount: €${totalOrderAmount.toFixed(2)}`);
          console.log(`   - Total Profit Amount: €${totalProfitAmount.toFixed(2)}`);

          console.log(`\n [CAPTURE ORDER] Order Pivot Details:`);
          console.log(`   - Product Type: ${productType}`);
          console.log(`   - Price: €${pivot.price}`);
          console.log(`   - B2B Price: €${pivot.b2b_price}`);
          console.log(`   - Quantity: ${pivot.quantity}`);

          console.log(`\n[VAT CALCULATION]`);
          console.log(`Product ID: ${pivot.product_id}`);
          console.log(`VAT: ${vatPercent}%`);
          console.log(`Gross Price: ${grossPrice} → Net: ${sellNetBase}`);
          console.log(`Gross B2B: ${grossB2B} → Net: ${b2bNetBase}`);
          console.log(`Net Total: ${productNetTotal}`);
          console.log(`Profit: ${productProfit}`);
        }

        totalCommissionPercent =
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

      const distribution = [];
      let rowsToInsert = [];

      let totalCommissionAmount = 0;

      console.log(` [CAPTURE ORDER] Starting commission distribution for ${activeLevels.length} brokers (product_type: ${productType})`);

      for (let i = 0; i < activeLevels.length; i++) {
        const currentBroker = activeLevels[i];
        const commissionPercent = normalizedPercents[i];

        console.log(`\n [CAPTURE ORDER] ==========================================`);
        console.log(` [CAPTURE ORDER] Level ${i + 1} Commission Calculation START (product_type: ${productType})`);
        console.log(` [CAPTURE ORDER] ==========================================`);
        console.log(` [CAPTURE ORDER] Input Values:`);
        console.log(`   - Broker ID: ${currentBroker.id}`);
        console.log(`   - User ID: ${currentBroker.user_id}`);
        console.log(`   - Commission Percent (raw): ${commissionPercent}`);
        console.log(`   - Commission Percent (type): ${typeof commissionPercent}`);

        const isFlatCommissionFlow = isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken || isPrimeInvest || isDealerPurchasing || isDealerPurchasingDiamond || isGoldPriceFixing;
        const rawCalculation = isFlatCommissionFlow ? (commissionPercent / 100) * b2bCommissionAmount : (commissionPercent / 100) * totalProfitAmount;

        console.log(` [CAPTURE ORDER] Calculation Steps:`);
        console.log(`   - Step 1: (${commissionPercent} / 100) = ${commissionPercent / 100}`);
        console.log(`   - Step 2: ${commissionPercent / 100} * ${isFlatCommissionFlow ? b2bCommissionAmount : totalProfitAmount} = ${rawCalculation}`);
        console.log(`   - Step 3: ${rawCalculation}.toFixed(2) = ${rawCalculation.toFixed(2)}`);

        const commissionAmount = parseFloat(rawCalculation.toFixed(2));
        totalCommissionAmount += commissionAmount;

        console.log(`   - Step 4: parseFloat(${rawCalculation.toFixed(2)}) = ${commissionAmount}`);
        console.log(` [CAPTURE ORDER] Final Commission Amount:`);
        console.log(`   - Value: ${commissionAmount}`);
        console.log(`   - Type: ${typeof commissionAmount}`);
        console.log(`   - Is NaN: ${isNaN(commissionAmount)}`);
        console.log(`   - Is Null: ${commissionAmount === null}`);
        console.log(`   - Is Undefined: ${commissionAmount === undefined}`);

        const isSeller = i === 0;
        console.log(` [CAPTURE ORDER] Additional Info:`);
        console.log(`   - Is Seller: ${isSeller}`);

        if (commissionAmount <= 0 || isNaN(commissionAmount)) {
          console.error(` [CAPTURE ORDER] ⚠️ WARNING: Commission Amount is ${commissionAmount} for Level ${i + 1} (product_type: ${productType})!`);
          console.error(` [CAPTURE ORDER] ⚠️ Check: commissionPercent=${commissionPercent}%, totalProfitAmount=€${isFlatCommissionFlow ? b2bCommissionAmount : totalProfitAmount}`);
          console.error(` [CAPTURE ORDER] ⚠️ Raw calculation result: ${rawCalculation}`);
        }

        console.log(targetCustomerLogFound, "targetCustomerLogFound");

        distribution.push({
          level: i + 1,
          broker_id: currentBroker.id,
          user_id: currentBroker.user_id,
          commission_percent: commissionPercent,
          commission_amount: commissionAmount,
          is_seller: isSeller,
          product_type: productType,
          target_customer_log_id: targetCustomerLogFound !== null ? targetCustomerLogFound.id : customerInfo ? customerInfo.id : null,
          is_send_bonus: targetCustomerLogFound !== null ? true : false
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
        console.log(`   - Product Type: ${productType}`);
        console.log(`   - Commission Percent: ${commissionPercent} (type: ${typeof commissionPercent})`);
        console.log(`   - Commission Amount (raw): ${commissionAmount} (type: ${typeof commissionAmount})`);
        if (!isFlatCommissionFlow) {
          console.log(`   - Profit Amount: ${totalProfitAmount} (type: ${typeof totalProfitAmount})`);
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
          console.error(` [CAPTURE ORDER] ❌ commissionPercent: ${commissionPercent}, totalProfitAmount: ${isFlatCommissionFlow ? b2bCommissionAmount : totalProfitAmount}`);
          console.error(` [CAPTURE ORDER] ❌ commissionPercent type: ${typeof commissionPercent}`);
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
        console.log(`order?.choose_payment_option: ${order?.choose_payment_option}`);

        let selected_payment = order?.selected_payment_method || selected_payment_method;
        let choose_payment_option = order?.choose_payment_option || 1;

        const orderAmountForRow =
          isGoldFlex || isEasyGoldToken || isPrimeInvest || isDealerPurchasing || isDealerPurchasingDiamond || isGoldPriceFixing
            ? parseFloat(Number(b2bCommissionAmount).toFixed(2))
            : isGoldPurchase || isGoldPurchaseSell
              ? parseFloat(order.confirmed_price.toFixed(2))
              : parseFloat(totalOrderAmount.toFixed(2));

        rowsToInsert.push({
          broker_id: currentBroker.id,
          user_id: currentBroker.user_id,
          order_id: orderId,
          order_type: orderType,
          product_type: productType,
          order_amount: orderAmountForRow,
          commission_percent: parseFloat(commissionPercent.toFixed(2)),
          commission_amount: commissionAmount,
          tree,
          is_seller: isSeller,
          selected_payment_method: selected_payment || 1,
          choose_payment_option: choose_payment_option || 1,
          target_customer_log_id: targetCustomerLogFound
            ? targetCustomerLogFound.id
            : customerInfo
              ? customerInfo.id
              : null,
          is_send_bonus: targetCustomerLogFound ? true : false,
        });

        console.log(`\n [CAPTURE ORDER] Database Create Object (Preview):`);
        console.log(`   - broker_id: ${currentBroker.id} (type: ${typeof currentBroker.id})`);
        console.log(`   - user_id: ${currentBroker.user_id} (type: ${typeof currentBroker.user_id})`);
        console.log(`   - order_id: ${orderId} (type: ${typeof orderId})`);
        console.log(`   - order_type: ${orderType} (type: ${typeof orderType})`);
        console.log(`   - product_type: ${productType}`);
        console.log(`   - order_amount: ${orderAmountForRow} (type: ${typeof orderAmountForRow})`);
        console.log(`   - commission_percent: ${commissionPercent} (type: ${typeof commissionPercent})`);
        console.log(`   - commission_amount: ${commissionAmount} (type: ${typeof commissionAmount})`);
        console.log(`   - commission_amount is null: ${commissionAmount === null}`);
        console.log(`   - commission_amount is undefined: ${commissionAmount === undefined}`);
        console.log(`   - commission_amount is NaN: ${isNaN(commissionAmount)}`);
        console.log(`   - tree: ${tree} (type: ${typeof tree})`);
        console.log(`   - is_seller: ${isSeller} (type: ${typeof isSeller})`);

        console.log(`\n [CAPTURE ORDER] Attempting Database Create...`);
        console.log(`   - This commission_percent and commission_amount will be shown in frontend via getAllBrokerCommissionHistory API\n`);
        console.log(` [CAPTURE ORDER] ==========================================`);
        console.log(` [CAPTURE ORDER] Level ${i + 1} Commission Calculation END (product_type: ${productType})`);
        console.log(` [CAPTURE ORDER] ==========================================\n`);

        if (!isEasyGoldToken && !isGoldFlex && !isPrimeInvest && i === 0) {
          // ✅ Increment total commission in Brokers table
          await db.Brokers.increment(
            { total_commission_amount: commissionAmount },
            { where: { id: currentBroker.id } }
          );
          console.log(` [CAPTURE ORDER] Updated total commission for broker ID: ${currentBroker.id} (product_type: ${productType})`);
        }
      }

      const finalProfitAmount =
        isGoldFlex || isEasyGoldToken || isPrimeInvest || isDealerPurchasing || isDealerPurchasingDiamond || isGoldPriceFixing
          ? parseFloat(totalCommissionAmount.toFixed(2))
          : isGoldPurchase || isGoldPurchaseSell
            ? b2bCommissionAmount
            : parseFloat(totalProfitAmount.toFixed(2));

      rowsToInsert = rowsToInsert.map((row) => ({
        ...row,
        profit_amount: finalProfitAmount,
      }));

      allRowsToInsert.push(...rowsToInsert);
      allDistributions.push(...distribution);
      groupSummaries.push({
        productType,
        totalCommissionPercent: isGoldPurchase || isGoldPurchaseSell || isGoldFlex || isEasyGoldToken || isPrimeInvest || isDealerPurchasing || isDealerPurchasingDiamond || isGoldPriceFixing ? 100 : parseFloat(totalCommissionPercent.toFixed(2)),
        totalProfitAmount: finalProfitAmount,
        distribution,
        tree,
      });
    }

    await db.BrokerCommissionHistory.bulkCreate(allRowsToInsert);

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log(`\n✅ [CAPTURE ORDER] ==========================================`);
    console.log(`✅ [CAPTURE ORDER] Commission distribution completed successfully`);
    console.log(`✅ [CAPTURE ORDER] Order ID: ${orderId}`);
    console.log(`✅ [CAPTURE ORDER] Order Type: ${orderType}`);
    console.log(`✅ [CAPTURE ORDER] Service Type: ${serviceType}`);
    console.log(`✅ [CAPTURE ORDER] Product type groups processed: [${productTypesToProcess.join(", ")}]`);
    console.log(`✅ [CAPTURE ORDER] Total Brokers per group: ${activeLevels.length}`);
    console.log(`✅ [CAPTURE ORDER] Tree Structure: ${tree}`);
    console.log(`✅ [CAPTURE ORDER] Commission Distribution Summary:`);
    allDistributions.forEach((dist) => {
      console.log(`   [${dist.product_type}] Level ${dist.level}: Broker ${dist.broker_id} → ${dist.commission_percent}% (€${dist.commission_amount})`);
    });
    console.log(`✅ [CAPTURE ORDER] END TIME: ${endTime.toISOString()}`);
    console.log(`✅ [CAPTURE ORDER] DURATION: ${duration}ms`);
    console.log(`✅ [CAPTURE ORDER] ==========================================\n`);

    // Top-level fields mirror the first (and, for every order type other than
    // diamond_gemstone, the only) group so existing consumers keep working unchanged.
    const primarySummary = groupSummaries[0];

    return res.status(200).json({
      success: true,
      message: "Commission distribution stored successfully",
      data: {
        totalCommissionPercent: primarySummary.totalCommissionPercent,
        totalProfitAmount: primarySummary.totalProfitAmount,
        distribution: allDistributions,
        tree,
        productTypeBreakdown: groupSummaries,
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
