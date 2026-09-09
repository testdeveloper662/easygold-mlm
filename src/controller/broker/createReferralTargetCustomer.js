require("dotenv").config();
const db = require("../../models");
const { Op } = require("sequelize");

const CreateReferralTargetCustomer = async (req, res) => {
  try {
    const { customer_name, customer_email, referral_code, product_type } = req.body;

    let interest_in = "";
    if (product_type == "easygold") {
      interest_in = "easygold Token";
    } else if (product_type == "primeinvest") {
      interest_in = "Primeinvest";
    } else if (product_type == "goldflex") {
      interest_in = "goldflex";
    }

    let decodedCode = referral_code;
    if (referral_code) {
      try {
        const decoded = Buffer.from(referral_code, "base64").toString("utf-8");
        if (decoded && decoded.trim() !== "") {
          decodedCode = decoded;
        }
      } catch (e) {}
    }

    // 1. Search in UserReferrals table first
    let userRef = null;
    if (db.UserReferrals && referral_code) {
      userRef = await db.UserReferrals.findOne({
        where: {
          [Op.or]: [
            { referral_code: referral_code },
            { referral_code: decodedCode }
          ]
        }
      });
    }

    // 2. Search in Brokers table
    let broker = null;
    if (referral_code) {
      broker = await db.Brokers.findOne({
        where: {
          [Op.or]: [
            { referral_code: referral_code },
            { referral_code: decodedCode }
          ]
        },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "display_name", "landing_page", "mystorekey", "user_email"]
          }
        ]
      });
    }

    // 3. Search in Affiliates table
    let affiliate = null;
    if (!broker && db.Affiliates && referral_code) {
      affiliate = await db.Affiliates.findOne({
        where: {
          [Op.or]: [
            { referral_code: referral_code },
            { referral_code: decodedCode }
          ]
        },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "display_name", "landing_page", "mystorekey", "user_email"]
          }
        ]
      });
    }

    // Determine target user ID
    const targetUserId = userRef?.user_id || broker?.user_id || affiliate?.user_id;

    // Get user from Users table
    let userRecord = null;
    if (targetUserId) {
      userRecord = await db.Users.findOne({
        where: { ID: targetUserId },
        attributes: ["ID", "display_name", "landing_page", "mystorekey", "user_email"]
      });
    }

    const userObj = broker?.user || affiliate?.user || userRecord;

    if (!userObj && !broker && !affiliate && !userRef) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userIdForMeta = userObj?.ID || targetUserId;
    const refCode = userRef?.referral_code || broker?.referral_code || affiliate?.referral_code || referral_code;

    // Get refer_id from user_referrals table (without creating broker table entry)
    if (!userRef && targetUserId) {
      userRef = await db.UserReferrals.findOne({ where: { user_id: targetUserId } });

      if (!userRef && db.UserReferrals) {
        try {
          userRef = await db.UserReferrals.create({
            user_id: targetUserId,
            referral_code: refCode || null,
          });
        } catch (err) {
          console.error("Error creating UserReferrals record:", err.message);
          userRef = await db.UserReferrals.findOne({ where: { user_id: targetUserId } });
        }
      }
    }

    const referId = userRef ? userRef.id : null;

    let brokerMeta = [];
    if (userIdForMeta) {
      brokerMeta = await db.UsersMeta.findAll({
        where: {
          user_id: userIdForMeta,
          meta_key: [
            "u_company",
            "u_street_no",
            "u_street",
            "u_location",
            "u_postcode",
            "u_country",
            "u_phone",
            "language"
          ]
        },
        attributes: ["meta_key", "meta_value"]
      });
    }

    const sanitizeValue = (val) => {
      if (!val) return false;
      const cleaned = String(val).trim();
      const lower = cleaned.toLowerCase();

      // Remove null, undefined, blank, "null", "undefined"
      if (!cleaned || lower === "null" || lower === "undefined") return false;

      return cleaned;
    };

    const metaMap = {};
    brokerMeta.forEach((meta) => {
      metaMap[meta.meta_key] = meta.meta_value || null;
    });

    // Address formatting with removing undefined/empty
    const addressParts = [
      metaMap.u_street_no,
      metaMap.u_street,
      metaMap.u_location,
      metaMap.u_country,
      metaMap.u_postcode
    ].filter(item => item && item !== "undefined" && item !== "null");

    let formattedAddress = addressParts.join(", ");

    const companyInfo = sanitizeValue(metaMap.u_company) ? metaMap.u_company : "";
    const phoneInfo = sanitizeValue(metaMap.u_phone) ? metaMap.u_phone : "";

    if (companyInfo || phoneInfo) {
      formattedAddress += " / " + [companyInfo, phoneInfo].filter(sanitizeValue).join(", ");
    }

    // Validate required fields
    if (!customer_name || !customer_email) {
      return res.status(400).json({
        success: false,
        message: "Customer name and email are required",
      });
    }

    let existingCustomer;

    const uniquenessOrClause = [
      ...(referId ? [{ refer_id: referId }] : [])
    ];

    switch (interest_in) {
      case "easygold Token":
        // Global uniqueness
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "easygold Token",
          },
          attributes: ["id", "broker_id", "refer_id", "status"],
          raw: true
        });
        break;

      case "goldflex":
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "goldflex",
          },
          attributes: ["id", "broker_id", "refer_id", "status"],
          raw: true
        });
        break;

      case "Primeinvest":
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "Primeinvest",
          },
          attributes: ["id", "broker_id", "refer_id", "status"],
          raw: true
        });
        break;

      default:
        // Referral-level uniqueness
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            ...(uniquenessOrClause.length > 0 ? { [Op.or]: uniquenessOrClause } : {}),
            customer_email,
            interest_in,
          },
          raw: true
        });
        break;
    }

    if (existingCustomer) {
      if (existingCustomer.status == "REGISTERED") {
        return res.status(200).json({
          success: true,
          skipped: false,
          message: "You already submitted form for this product",
          data: existingCustomer
        });
      }

      return res.status(200).json({
        success: true,
        skipped: true,
        message: "Customer already exists for this product",
        data: existingCustomer
      });
    }

    // Create target customer with refer_id and broker_id as null
    const targetCustomer = await db.TargetCustomers.create({
      broker_id: null,
      refer_id: referId,
      customer_name,
      customer_email,
      referral_code: null,
      interest_in: interest_in || null,
      referred_by_code: refCode,
      status: "INVITED",
      children_count: 0,
      bonus_points: 0,
      parent_customer_id: null
    });

    return res.status(201).json({
      success: true,
      skipped: true,
      message: "Target customer created successfully",
      data: targetCustomer,
    });
  } catch (error) {
    console.error("Error creating target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = CreateReferralTargetCustomer;
