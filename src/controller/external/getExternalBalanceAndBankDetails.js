const db = require("../../models");
const { Op } = require("sequelize");
const { getBrokerCommissionTotals, getAffiliateCommissionTotals } = require("../../utils/getBrokerCommissionTotals");

const GetExternalBalanceAndBankDetails = async (req, res) => {
  try {
    const { email, product } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await db.Users.findOne({ where: { user_email: email } });

    if (!user) {
      return res.status(200).json({
        success: true,
        role_id: null,
        role: null,
        isbroker: false,
        isaffiliate: false,
        data: null
      });
    }

    let isbroker = false;
    let isaffiliate = false;
    let iscustomer = false;

    // role_id 2 = BROKER
    // role_id 3 = AFFILIATE
    // role_id 4 = PRIVATE INDIVIDUAL
    if (user.role_id === 2 || user.role_id === 3) {
      isbroker = true;
      isaffiliate = true;
    } else if (user.role_id === 4) {
      isaffiliate = true;
      isbroker = false;
    } else if (user.role_id === 5) {
      iscustomer = true;
    }

    let result = {
      bank_details: []
    };

    const userMetaRows = await db.UsersMeta.findAll({
      where: {
        user_id: user.ID,
        meta_key: ["banks"]
      },
      raw: true
    });
    
    const metaMap = {};
    userMetaRows.forEach(m => {
      metaMap[m.meta_key] = m.meta_value;
    });

    const parseBanksObj = (raw) => {
      let parsed = null;
      if (raw) {
        try {
          parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (e) {}
      }

      // If it's an array (old format), wrap it in sepa. Otherwise return the new format directly.
      if (Array.isArray(parsed)) {
          return { sepa: parsed };
      }
      return parsed || {};
    };

    const flatBankData = parseBanksObj(metaMap.banks);
    let unifiedBalance = 0;
    
    // Map product query to wallet key
    const B2B_TYPES = ["my_store", "api", "landing_page", "gold_purchase", "gold_purchase_sell_orders", "goldprice_fixing", "dealer_purchasing", "dealer_purchasing_diamond"];
    const TYPE_MAPPING = {
        easygoldtoken: "EASYGOLD_TOKEN",
        primeinvest: "PRIMEINVEST",
        goldflex: "GOLDFLEX",
    };
    
    let targetWalletKey = null;
    if (product) {
        const prodLower = product.toLowerCase();
        if (B2B_TYPES.includes(prodLower)) {
            targetWalletKey = "B2B_DASHBOARD";
        } else {
            targetWalletKey = TYPE_MAPPING[prodLower] || prodLower.toUpperCase();
        }
    }
    
    if ((isbroker || isaffiliate || iscustomer)) {
        let totals = {};
        if (isbroker) {
            totals = await getBrokerCommissionTotals({ user });
        } else {
            totals = await getAffiliateCommissionTotals({ user });
        }
        
        // Subtract payouts
        const approvedPayouts = await db.BrokerPayoutRequests.findAll({
            where: { user_id: user.ID, status: "APPROVED" },
            attributes: [ "payout_for", [db.Sequelize.fn("SUM", db.Sequelize.col("amount")), "total_amount"] ],
            group: ["payout_for"],
            raw: true
        });
        
        approvedPayouts.forEach(p => {
            if (p.payout_for && totals[p.payout_for] !== undefined) {
                totals[p.payout_for] = Math.max(0, totals[p.payout_for] - Number(p.total_amount || 0));
            }
        });
        
        if (targetWalletKey && totals[targetWalletKey] !== undefined) {
            unifiedBalance = totals[targetWalletKey];
        } else if (!product) {
            unifiedBalance = Object.values(totals).reduce((a, b) => a + b, 0);
        } else {
            // fallback if product is something unknown, keep it 0 or run a raw sum
            const sum = await db.BrokerCommissionHistory.sum('commission_amount', {
                where: { user_id: user.ID, is_deleted: false, is_payment_done: true, order_type: product }
            });
            unifiedBalance = sum || 0;
        }
    }

    result.bank_details = flatBankData;
    result.balance = unifiedBalance;

    let roleValue = "";
    if (user.role_id === 2) roleValue = "BROKER";
    else if (user.role_id === 3) roleValue = "AFFILIATE";
    else if (user.role_id === 4) roleValue = "PRIVATE INDIVIDUAL";
    else if (user.role_id === 5) roleValue = "CUSTOMER";

    return res.status(200).json({
      success: true,
      role_id: user.role_id,
      role: roleValue,
      isbroker,
      isaffiliate,
      iscustomer,
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = GetExternalBalanceAndBankDetails;
