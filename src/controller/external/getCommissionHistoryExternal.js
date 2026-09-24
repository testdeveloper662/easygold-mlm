const db = require("../../models");
const { Op } = require("sequelize");

const GetExternalCommissionHistoryLogs = async (req, res) => {
  try {
    const { email, page = 1, limit = 10, search, product, order_id, orderid } = req.query;

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

    // Build common condition
    const condition = {
      is_deleted: false,
      is_payment_done: true,
    };

    const searchQuery = search || order_id || orderid;
    if (searchQuery) {
      condition.order_id = { [Op.like]: `%${searchQuery}%` };
    }

    if (product) {
      condition.order_type = product;
    }

    let combinedData = [];

    if ((isbroker || isaffiliate || iscustomer) && db.BrokerCommissionHistory) {
      const logs = await db.BrokerCommissionHistory.findAll({
        where: { ...condition, user_id: user.ID },
        raw: true
      });
      
      // Since all roles now share the same table without a role_type flag, 
      // we just return the user's unified commission history.
      combinedData = [...combinedData, ...logs];
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
      iscustomer,
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
