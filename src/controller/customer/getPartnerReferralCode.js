const db = require("../../models");

const normalizeProduct = (product) => {
  if (!product) return null;
  const p = product.toString().trim().toLowerCase().replace(/[\s_\-]+/g, "");
  if (p.includes("prime") || p === "primeinvest") return "Primeinvest";
  if (p.includes("easygold") || p.includes("token") || p === "easygoldtoken") return "easygold Token";
  if (p.includes("goldflex") || p.includes("flex") || p === "goldflex") return "goldflex";
  if (p.includes("landing") || p === "landingpage") return "Landingpage";
  return product.toString().trim();
};

const GetPartnerReferralCode = async (req, res) => {
  try {
    const email = (req.body?.email || req.query?.email || "").trim();
    const productInput = (req.body?.product || req.query?.product || "").trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Customer email is required in payload",
      });
    }

    const normalizedProduct = normalizeProduct(productInput);

    let customer = null;

    // 1. Search by email and matching product (normalized or exact)
    if (normalizedProduct) {
      customer = await db.TargetCustomers.findOne({
        where: {
          customer_email: email,
          [db.Sequelize.Op.or]: [
            { interest_in: normalizedProduct },
            { interest_in: productInput },
          ],
        },
        order: [["createdAt", "DESC"]],
      });
    }

    // 2. If not found and product was given or omitted, fallback search by email
    if (!customer) {
      customer = await db.TargetCustomers.findOne({
        where: {
          customer_email: email,
        },
        order: [["createdAt", "DESC"]],
      });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: `No target customer found with email: ${email}${productInput ? ` and product: ${productInput}` : ""}`,
      });
    }

    // 3. Find parent referral code
    let rawReferralCode = customer.referred_by_code;

    // If referred_by_code is not set, look up broker or affiliate
    if (!rawReferralCode && customer.broker_id) {
      const broker = await db.Brokers.findByPk(customer.broker_id, {
        attributes: ["id", "referral_code"],
      });
      if (broker?.referral_code) {
        rawReferralCode = broker.referral_code;
      } else if (db.Affiliates) {
        const affiliate = await db.Affiliates.findByPk(customer.broker_id, {
          attributes: ["id", "referral_code"],
        });
        if (affiliate?.referral_code) {
          rawReferralCode = affiliate.referral_code;
        }
      }
    }

    // If still not found and customer has parent_customer_id, check parent customer
    if (!rawReferralCode && customer.parent_customer_id) {
      const parentCust = await db.TargetCustomers.findByPk(customer.parent_customer_id);
      if (parentCust) {
        rawReferralCode = parentCust.referral_code || parentCust.referred_by_code;
      }
    }

    // Fallback to ADMIN referral code if no parent code was configured
    if (!rawReferralCode) {
      rawReferralCode = process.env.ADMIN_REFERRAL_CODE || "ADMIN";
    }

    // Base64 encode referral code for URLs
    const encodedReferralCode = Buffer.from(String(rawReferralCode), "utf-8").toString("base64");

    // Dynamic frontend base URL from environment
    const envFrontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || "";
    const cleanBaseUrl = envFrontendUrl
      ? envFrontendUrl.trim().replace(/\/$/, "")
      : (req.headers.origin ? req.headers.origin.replace(/\/$/, "") : "");

    return res.status(200).json({
      success: true,
      message: "Parent referral code retrieved successfully",
      data: {
        referral_code: encodedReferralCode,
        raw_referral_code: rawReferralCode,
        encoded_referral_code: encodedReferralCode,
        customer_id: customer.id,
        customer_name: customer.customer_name,
        customer_email: customer.customer_email,
        product: customer.interest_in || productInput,
        partner_referral_url: `${cleanBaseUrl}/partner-referral/${encodedReferralCode}`,
        broker_registration_url: `${cleanBaseUrl}/broker-register/step1/${encodedReferralCode}`,
        affiliate_registration_url: `${cleanBaseUrl}/affiliate-register?referral=${encodedReferralCode}`,
      },
    });
  } catch (error) {
    console.error("Error in GetPartnerReferralCode:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving parent referral code",
      error: error.message,
    });
  }
};

module.exports = GetPartnerReferralCode;
