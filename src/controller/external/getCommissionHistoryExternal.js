const db = require("../../models");
const { Op } = require("sequelize");

const GetExternalCommissionHistoryLogs = async (req, res) => {
  try {
    const { email, page = 1, limit = 10, search, product } = req.query;

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
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
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

    // Build common condition
    const condition = {
      is_deleted: false,
      is_payment_done: true,
    };

    if (search) {
      condition.order_id = { [Op.like]: `%${search}%` };
    }

    if (product) {
      condition.order_type = product;
    }

    const isBrokerRoute = req.originalUrl.includes('/broker/');
    const isAffiliateRoute = req.originalUrl.includes('/affiliate/');

    let combinedData = [];

    if (isbroker && db.BrokerCommissionHistory && (!isAffiliateRoute)) {
      const brokerLogs = await db.BrokerCommissionHistory.findAll({
        where: { ...condition, user_id: user.ID },
        raw: true
      });
      combinedData = [...combinedData, ...brokerLogs];
    }

    if (isaffiliate && db.AffiliateCommissionHistory && (!isBrokerRoute)) {
       const affiliateLogs = await db.AffiliateCommissionHistory.findAll({
         where: { 
           ...condition, 
           [Op.or]: [{ user_id: user.ID }, { affiliate_id: user.ID }]
         },
         raw: true
       });
       combinedData = [...combinedData, ...affiliateLogs];
    }

    // Sort combined data by createdAt DESC
    combinedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    // Pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    const paginatedData = combinedData.slice(startIndex, endIndex);

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
      data: paginatedData,
      pagination: {
        total: combinedData.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(combinedData.length / limitNum)
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = GetExternalCommissionHistoryLogs;
