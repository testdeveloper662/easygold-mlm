require("dotenv").config();
const db = require("../../models");
const { Op } = require("sequelize");

const GetTargetCustomers = async (req, res) => {
  try {
    const { user } = req.user;

    const targetUserId = (user.role === "SUPER_ADMIN" && req.query.viewUserId)
      ? parseInt(req.query.viewUserId)
      : user.ID;

    // Get user record
    const userRecord = await db.Users.findOne({
      where: { ID: targetUserId },
      attributes: ["ID", "display_name", "landing_page", "mystorekey", "user_email"]
    });

    // Get broker details if exists
    let broker = await db.Brokers.findOne({
      where: { user_id: targetUserId },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["display_name", "landing_page", "mystorekey", "user_email"]
        }
      ]
    });

    // Try finding in Affiliates if broker not found
    let affiliate = null;
    if (!broker && db.Affiliates) {
      affiliate = await db.Affiliates.findOne({
        where: { user_id: targetUserId },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["display_name", "landing_page", "mystorekey", "user_email"]
          }
        ]
      });
    }

    // Get referral code from UserReferrals table first
    let userRefRecord = await db.UserReferrals.findOne({ where: { user_id: targetUserId } });

    // Auto-create UserReferrals record if missing for existing user
    if (!userRefRecord && db.UserReferrals && targetUserId) {
      try {
        const refCode = broker?.referral_code || affiliate?.referral_code || null;
        userRefRecord = await db.UserReferrals.create({
          user_id: targetUserId,
          referral_code: refCode,
        });
      } catch (err) {
        userRefRecord = await db.UserReferrals.findOne({ where: { user_id: targetUserId } });
      }
    }

    // Fetch child user_referrals where parent_user_id = targetUserId
    const childUserRefs = await db.UserReferrals.findAll({
      where: { parent_user_id: targetUserId },
      attributes: ["id"],
      raw: true,
    });

    const referralCodeIds = [];
    if (userRefRecord?.id) {
      referralCodeIds.push(userRefRecord.id);
    }
    if (childUserRefs && childUserRefs.length > 0) {
      childUserRefs.forEach((r) => {
        if (r.id && !referralCodeIds.includes(r.id)) {
          referralCodeIds.push(r.id);
        }
      });
    }

    // Fallback for referral code: UserReferrals -> Brokers -> Affiliates
    const refCode = userRefRecord?.referral_code || broker?.referral_code || affiliate?.referral_code;

    // Fallback for user details
    const userObj = broker?.user || affiliate?.user || userRecord;

    if (!userObj && !broker && !affiliate && !userRefRecord) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Build where clause using referral_code_id (with parent_user_id children) & broker_id fallback
    const brokerId = broker?.id || affiliate?.id;
    const ownerConditions = [];

    if (referralCodeIds.length > 0) {
      ownerConditions.push({ referral_code_id: { [Op.in]: referralCodeIds } });
    }
    if (brokerId) {
      ownerConditions.push({ broker_id: brokerId });
    }

    const whereClause = ownerConditions.length > 0 ? { [Op.or]: ownerConditions } : {};

    // Add search filter
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { customer_name: { [Op.like]: `%${search}%` } },
          { customer_email: { [Op.like]: `%${search}%` } },
        ],
      };
      whereClause[Op.and] = [searchCondition];
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
        user_id: targetUserId,
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

    let easyGoldReferralCode = refCode ? Buffer.from(String(refCode), "utf-8").toString("base64") : "";

    return res.status(200).json({
      success: true,
      message: "Target customers retrieved successfully",
      data: {
        referralPdfEnLink: `${process.env.NODE_URL}uploads/agreements/gold_bonus_for_referrals_en.pdf`,
        referralPdfDeLink: `${process.env.NODE_URL}uploads/agreements/gold_bonus_for_referrals_de.pdf`,
        easyGoldLink: `${process.env.EASY_GOLD_FRONTEND_URL}`,
        easyGoldReferralLink: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/easygold`,
        easygoldPdfLink: `${process.env.NODE_URL}uploads/agreements/whitepaper_easygold_token.pdf`,
        primeInvestLink: `${process.env.PRIME_INVEST_URL}`,
        primeInvestReferralLink: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/primeinvest`,
        primeInvestEnPdfLink: `${process.env.NODE_URL}uploads/agreements/hartmann_benz_inc_share.pdf`,
        primeInvestDePdfLink: `${process.env.NODE_URL}uploads/agreements/hartmann_benz_inc_share_de.pdf`,
        landingPageReferralLink: `${process.env.EASY_GOLD_URL}/landingpage/${userObj?.mystorekey || ""}`,
        landingPageEnPdfLink: `${process.env.NODE_URL}uploads/agreements/landing_page_en.pdf`,
        landingPageDePdfLink: `${process.env.NODE_URL}uploads/agreements/landing_page_de.pdf`,
        goldflexLink: `${process.env.GOLD_FLEX_URL}`,
        goldflexReferralLink: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/goldflex`,
        goldflexPdfLink: null,
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
