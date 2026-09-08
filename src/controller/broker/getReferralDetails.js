const db = require("../../models");
const geoip = require("geoip-lite");

const GERMAN_COUNTRIES = ["DE", "AT", "CH"];

const GetReferralDetails = async (req, res) => {
  try {
    const referralCode = req.query.referral_code;
    let referralName = null;
    let limitReached = false;
    let totalChildren = 0;

    let ip =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip);
    console.log(ip, "ip");
    console.log(geo, "geo");
    const country = geo?.country || "US";

    let language = GERMAN_COUNTRIES.includes(country) ? "de" : "en";

    if (!referralCode) {
      return res.json({
        success: true,
        referral_code: null,
        referral_name: null,
        limitReached: false,
        language,
        country,
        contracts: null
      });
    }

    const contracts = await db.AdminContracts.findAll({
      where: {
        showonregister: 1
      },
      attributes: [
        "id",
        "document_key",
        "english_name",
        "german_name",
        "english_pdf_file",
        "german_pdf_file"
      ],
      order: [["id", "ASC"]],
      raw: true
    });

    const formattedContracts = contracts.map(contract => ({
      id: contract.id,
      document_key: contract.document_key,
      english_name: contract.english_name ? contract.english_name : contract.german_name,
      german_name: contract.german_name ? contract.german_name : contract.english_name,
      english_pdf_file: contract.english_pdf_file
        ? `${process.env.NODE_URL}public/uploads/contracts/${contract.english_pdf_file}`
        : `${process.env.NODE_URL}public/uploads/contracts/${contract.german_pdf_file}`,
      german_pdf_file: contract.german_pdf_file
        ? `${process.env.NODE_URL}public/uploads/contracts/${contract.german_pdf_file}`
        : `${process.env.NODE_URL}public/uploads/contracts/${contract.english_pdf_file}`
    }));

    const cleanCode = (referralCode || "").trim().toUpperCase();
    const adminCode = (process.env.ADMIN_REFERRAL_CODE || "ADMIN").trim().toUpperCase();

    if (cleanCode === adminCode || cleanCode === "ADMIN" || cleanCode === "ADMINISTRATOR") {
      return res.json({
        success: true,
        referral_code: referralCode,
        referral_name: "System Admin",
        total_children: 0,
        limitReached: false,
        language,
        country,
        contracts: formattedContracts,
      });
    }

    // 1️⃣ Find parent referral record in user_referrals table
    let parentReferral = await db.UserReferrals.findOne({
      where: { referral_code: referralCode },
      attributes: ["id", "user_id", "children_count"],
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["display_name"],
          where: {
            deleted_at: null,
          },
          required: true,
        },
      ],
    });

    // Fallback: If not in UserReferrals, check Brokers or Affiliates
    if (!parentReferral) {
      const broker = await db.Brokers.findOne({
        where: { referral_code: referralCode },
        attributes: ["user_id"],
        include: [{ model: db.Users, as: "user", attributes: ["display_name"], where: { deleted_at: null } }]
      }) || (db.Affiliates ? await db.Affiliates.findOne({
        where: { referral_code: referralCode },
        attributes: ["user_id"],
        include: [{ model: db.Users, as: "user", attributes: ["display_name"], where: { deleted_at: null } }]
      }) : null);

      if (broker && broker.user) {
        parentReferral = {
          user_id: broker.user_id,
          user: broker.user,
          children_count: 0
        };
      }
    }

    if (!parentReferral) {
      return res.json({
        success: false,
        message: "Invalid referral code",
      });
    }

    // 2️⃣ Get total children count from user_referrals
    totalChildren = await db.UserReferrals.count({
      where: {
        parent_user_id: parentReferral.user_id,
      },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: [],
          where: {
            deleted_at: null,     // ✅ active users only
          },
          required: true,
        },
      ],
    });

    if (parentReferral.user) {
      referralName = parentReferral.user.display_name;
    }

    // 5️⃣ Final response
    return res.json({
      success: true,
      referral_code: referralCode,
      referral_name: referralName,
      total_children: totalChildren,
      limitReached,
      language,
      country,
      contracts: formattedContracts
    });
  } catch (error) {
    console.error("Error fetching referral details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

module.exports = GetReferralDetails;
