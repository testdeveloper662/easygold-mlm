require("dotenv").config();
const db = require("../../models");
const { Op } = require("sequelize");

const GetTargetCustomers = async (req, res) => {
  try {
    const { user } = req.user;

    // Get broker details
    const broker = await db.Brokers.findOne({
      where: { user_id: user.ID },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["display_name", "landing_page", "mystorekey", "user_email"]
        }
      ]
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    // Get pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Build where clause
    const whereClause = {
      broker_id: broker.id,
    };

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { customer_name: { [Op.like]: `%${search}%` } },
        { customer_email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Get total count
    const totalCount = await db.TargetCustomers.count({
      where: whereClause,
    });

    // Get paginated target customers
    const targetCustomers = await db.TargetCustomers.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    const customersWithPdfUrl = targetCustomers.map(c => {
      const customer = c.toJSON();

      if (customer.pdf_url) {
        customer.pdf_url = `${process.env.NODE_URL}${customer.pdf_url}`;
      }

      return customer;
    });

    let brokerLanguage = "en"; // Default to English
    const brokerMeta = await db.UsersMeta.findOne({
      where: {
        user_id: user.ID,
        meta_key: "language"
      },
      attributes: ["meta_value"]
    });

    if (brokerMeta && brokerMeta.meta_value) {
      const langStr = String(brokerMeta.meta_value).toLowerCase().trim();
      if (langStr === "de-de" || langStr === "de") {
        brokerLanguage = "de";
      }
    }

    let easyGoldReferralCode = Buffer.from(String(broker.referral_code), "utf-8").toString("base64");

    return res.status(200).json({
      success: true,
      message: "Target customers retrieved successfully",
      data: {
        // easyGoldReferralLink: `${process.env.EASY_GOLD_FRONTEND_URL}/${brokerLanguage}/broker/${easyGoldReferralCode}`,
        // primeInvestReferralLink: `${process.env.PRIME_INVEST_FRONTEND_URL}/${brokerLanguage}/broker/${easyGoldReferralCode}`,
        // landingPageReferralLink: `${process.env.EASY_GOLD_URL}/landingpage/${broker.user?.mystorekey}`,
        // goldflexReferralLink: `${process.env.GOLD_FLEX_FRONTEND_URL}/register?ref=${easyGoldReferralCode}`,
        easyGoldReferralLink: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/easygold`,
        primeInvestReferralLink: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/primeinvest`,
        landingPageReferralLink: `${process.env.EASY_GOLD_URL}/landingpage/${broker.user?.mystorekey}`,
        goldflexReferralLink: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/goldflex`,
        customers: customersWithPdfUrl,
        total: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching target customers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomers;
