const db = require("../../models");
const { Op } = require("sequelize");

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

    // role_id 2 = BROKER
    // role_id 3 = AFFILIATE
    // role_id 4 = PRIVATE INDIVIDUAL
    if (user.role_id === 2 || user.role_id === 3) {
      isbroker = true;
      isaffiliate = true;
    } else if (user.role_id === 4) {
      isaffiliate = true;
      isbroker = false;
    }

    let result = {
      broker_balance: 0,
      broker_bank_details: [],
      affiliate_balance: 0,
      affiliate_bank_details: []
    };

    const userMetaRows = await db.UsersMeta.findAll({
      where: {
        user_id: user.ID,
        meta_key: ["banks", "affiliate_banks"]
      },
      raw: true
    });
    
    const metaMap = {};
    userMetaRows.forEach(m => {
      metaMap[m.meta_key] = m.meta_value;
    });

    const parseBanksObj = (raw) => {
      let parsed = [];
      if (raw) {
        try {
          parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (e) {}
      }
      return parsed;
    };

    if (isbroker && db.Brokers) {
      const broker = await db.Brokers.findOne({ where: { user_id: user.ID }, raw: true });
      if (broker) {
        if (product && db.BrokerCommissionHistory) {
          const sum = await db.BrokerCommissionHistory.sum('commission_amount', {
            where: {
              user_id: user.ID,
              is_deleted: false,
              is_payment_done: true,
              order_type: product
            }
          });
          result.broker_balance = sum || 0;
        } else {
          result.broker_balance = broker.total_commission_amount || 0;
        }

        if (metaMap.banks) {
            result.broker_bank_details = parseBanksObj(metaMap.banks);
        } else if (db.BrokerBankDetails) {
            const bankDetails = await db.BrokerBankDetails.findAll({ where: { broker_id: broker.id }, raw: true });
            if (bankDetails && bankDetails.length > 0) {
                result.broker_bank_details = bankDetails;
            }
        }
      }
    }

    if (isaffiliate && db.Affiliates) {
      const affiliate = await db.Affiliates.findOne({ where: { user_id: user.ID }, raw: true });
      if (affiliate) {
        if (product && db.AffiliateCommissionHistory) {
          const sum = await db.AffiliateCommissionHistory.sum('commission_amount', {
            where: {
              [Op.or]: [{ user_id: user.ID }, { affiliate_id: user.ID }],
              is_deleted: false,
              is_payment_done: true,
              order_type: product
            }
          });
          result.affiliate_balance = sum || 0;
        } else {
          result.affiliate_balance = affiliate.total_commission_amount || 0;
        }

        if (metaMap.affiliate_banks) {
            result.affiliate_bank_details = parseBanksObj(metaMap.affiliate_banks);
        } else if (db.AffiliateBankDetails) {
            const bankDetails = await db.AffiliateBankDetails.findAll({ where: { affiliate_id: affiliate.id }, raw: true });
            if (bankDetails && bankDetails.length > 0) {
                result.affiliate_bank_details = bankDetails;
            }
        }
      }
    }

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
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = GetExternalBalanceAndBankDetails;
