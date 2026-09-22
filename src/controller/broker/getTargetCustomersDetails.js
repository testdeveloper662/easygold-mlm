const db = require("../../models");
const geoip = require("geoip-lite");

const GERMAN_COUNTRIES = ["DE", "AT", "CH"];

const GetTargetCustomersDetails = async (req, res) => {
  try {
    let ip =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip);
    const country = geo?.country || "US";

    let language = GERMAN_COUNTRIES.includes(country) ? "de" : "en";

    const { email, product_type } = req.query;

    let interest_in;
    let document_key;
    if (product_type == "easygold") {
      interest_in = "easygold Token";
      document_key = "b2c_easygold";
    } else if (product_type == "primeinvest") {
      interest_in = "Primeinvest";
      document_key = "b2c_primeinvest";
    } else if (product_type == "goldflex") {
      interest_in = "goldflex";
      document_key = "b2c_goldflex";
    }

    // Get target customer
    const targetCustomer = await db.TargetCustomers.findOne({
      where: {
        customer_email: email,
        interest_in: interest_in.trim(), // Ensure broker can only access their own customers
      },
      raw: true
    });

    if (!targetCustomer) {
      return res.status(200).json({
        success: false,
        notfound: true,
        message: "Target customer not found",
      });
    }

    if (targetCustomer.status?.trim().toUpperCase() === "REGISTERED") {
      return res.status(200).json({
        success: false,
        message: "Target customer already registered",
      });
    }

    let targetUserId = null;

    if (targetCustomer.referral_code_id) {
      const userRef = await db.UserReferrals.findOne({
        where: { id: targetCustomer.referral_code_id },
        raw: true,
      });
      targetUserId = userRef?.user_id;
    }

    if (!targetUserId && targetCustomer.broker_id) {
      const broker = await db.Brokers.findOne({
        where: { id: targetCustomer.broker_id },
        raw: true,
      });
      targetUserId = broker?.user_id;
    }

    if (!targetUserId && targetCustomer.referred_by_code) {
      const userRef = await db.UserReferrals.findOne({
        where: { referral_code: targetCustomer.referred_by_code },
        raw: true,
      });
      targetUserId = userRef?.user_id;

      if (!targetUserId) {
        const broker = await db.Brokers.findOne({
          where: { referral_code: targetCustomer.referred_by_code },
          raw: true,
        });
        targetUserId = broker?.user_id;
      }

      if (!targetUserId && db.Affiliates) {
        const affiliate = await db.Affiliates.findOne({
          where: { referral_code: targetCustomer.referred_by_code },
          raw: true,
        });
        targetUserId = affiliate?.user_id;
      }
    }

    /** 🔹 Get WordPress User */
    const user = targetUserId ? await db.Users.findOne({
      where: { ID: targetUserId },
      raw: true,
    }) : null;

    /** 🔹 Get WordPress User Meta */
    const userMetaRows = targetUserId ? await db.UsersMeta.findAll({
      where: { user_id: targetUserId },
      raw: true,
    }) : [];

    // Convert meta rows into key/value object
    const userMeta = {};
    userMetaRows.forEach((meta) => {
      userMeta[meta.meta_key] = meta.meta_value;
    });

    const street_house = [
      userMeta.u_street_no,
      userMeta.u_street
    ]
      .filter(Boolean)
      .join(", ");

    const postalcode_city = [
      userMeta.u_postcode,
      userMeta.u_location,
      userMeta.u_country
    ]
      .filter(Boolean)
      .join(", ");

    const contracts = await db.AdminContracts.findOne({
      attributes: [
        "id",
        "document_key",
        "english_name",
        "german_name",
        "english_pdf_file",
        "german_pdf_file"
      ],
      where: {
        document_key: document_key
      },
      order: [["id", "ASC"]],
      raw: true
    });

    return res.status(200).json({
      success: true,
      message: "Target customer retrieved successfully",
      country,
      language,
      companyname: userMeta.u_company || "",
      display_name: user?.display_name || "",
      street_house: street_house,
      postalcode_city: postalcode_city,
      email_address: user?.user_email || "",
      phone: userMeta.u_phone || "",
      english_pdf_file: contracts?.english_pdf_file ? `${process.env.NODE_URL}public/uploads/contracts/${contracts?.english_pdf_file}` : `${process.env.NODE_URL}public/uploads/contracts/${contracts?.german_pdf_file}`,
      german_pdf_file: contracts?.german_pdf_file ? `${process.env.NODE_URL}public/uploads/contracts/${contracts?.german_pdf_file}` : `${process.env.NODE_URL}public/uploads/contracts/${contracts?.english_pdf_file}`
    });
  } catch (error) {
    console.error("Error fetching target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomersDetails;

