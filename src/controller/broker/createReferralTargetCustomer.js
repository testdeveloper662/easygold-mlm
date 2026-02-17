require("dotenv").config();
const db = require("../../models");

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

    // Get broker details
    const broker = await db.Brokers.findOne({
      where: { referral_code: referral_code },
      attributes: ["id", "referral_code"],
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "display_name", "landing_page", "mystorekey", "user_email"]
        }
      ]
    });

    if (!broker) {
      return res.status(404).json({
        success: false,
        message: "Broker not found",
      });
    }

    const brokerMeta = await db.UsersMeta.findAll({
      where: {
        user_id: broker.user.ID,
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

    // Check if customer email already exists for this broker
    // const existingCustomer = await db.TargetCustomers.findOne({
    //   where: {
    //     broker_id: broker.id,
    //     customer_email: customer_email,
    //   },
    // });

    // if (existingCustomer) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Customer with this email already exists in your target list",
    //   });
    // }

    let existingCustomer;

    switch (interest_in) {
      case "easygold Token":
        // 🌍 Global uniqueness
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "easygold Token",
          },
          attributes: ["id", "broker_id", "status"],
          raw: true
        });
        break;

      case "goldflex":
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "goldflex",
          },
          attributes: ["id", "broker_id", "status"],
          raw: true
        });
        break;

      case "Primeinvest":
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            customer_email,
            interest_in: "Primeinvest",
          },
          attributes: ["id", "broker_id", "status"],
          raw: true
        });
        break;

      default:
        // 🧑‍💼 Broker-level uniqueness
        existingCustomer = await db.TargetCustomers.findOne({
          where: {
            broker_id: broker.id,
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

    // Create target customer
    const targetCustomer = await db.TargetCustomers.create({
      broker_id: broker.id,
      customer_name,
      customer_email,
      referral_code: null,
      interest_in: interest_in || null,
      referred_by_code: broker.referral_code,
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
