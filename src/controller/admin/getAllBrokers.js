const db = require("../../models");
const { Op } = require("sequelize");
require("dotenv").config();

const GetAllBrokers = async (req, res) => {
  try {
    const { user } = req.user;

    // Only SUPER_ADMIN can access
    if (user.role !== "SUPER_ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Access not allowed",
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // 1️⃣ Get paginated brokers with their user info
    const { count, rows: brokers } = await db.Brokers.findAndCountAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const userIds = brokers.map((b) => b.user_id);

    // 2️⃣ Fetch all usermeta for these users
    const metas = await db.UsersMeta.findAll({
      where: {
        user_id: {
          [Op.in]: userIds,
        },
        meta_key: {
          [Op.in]: [
            "u_trade_register",
            "u_travel_id",
            "signatureData",
            "u_company",
            "u_contact_person",
            "u_street_no",
            "u_street",
            "u_location",
            "u_postcode",
            "u_country",
            "u_vat_no",
            "u_tax_no",
            "u_phone",
            "u_landline_number",
            "language",
            "date",
            "u_web_site",
            "u_bank",
            "u_iban",
            "u_bic",
            "u_bank_address",
          ],
        },
      },
    });

    // Group metas by user_id
    const userMetaMap = {};
    metas.forEach((meta) => {
      if (!userMetaMap[meta.user_id]) userMetaMap[meta.user_id] = {};
      userMetaMap[meta.user_id][meta.meta_key] = meta.meta_value;
    });

    // 3️⃣ Combine data
    const brokerData = brokers.map((broker) => {
      const u = broker.user;
      const m = userMetaMap[u?.ID] || {};

      // Construct public URLs if exist
      const tradeRegisterUrl = m.u_trade_register
        ? `${process.env.PUBLIC_URL}${m.u_trade_register}`
        : null;
      const travelIdUrl = m.u_travel_id
        ? `${process.env.PUBLIC_URL}${m.u_travel_id}`
        : null;
      const signatureUrl = m.signatureData
        ? `${process.env.PUBLIC_URL}${m.signatureData}`
        : null;

      return {
        broker_id: broker.id,
        user_id: u?.ID || null,
        display_name: u?.display_name || null,
        user_email: u?.user_email || null,
        referral_code: broker.referral_code || null,

        // Meta fields
        company: m.u_company || null,
        contact_person: m.u_contact_person || null,
        street_no: m.u_street_no || null,
        street: m.u_street || null,
        location: m.u_location || null,
        postcode: m.u_postcode || null,
        country: m.u_country || null,
        vat_no: m.u_vat_no || null,
        tax_no: m.u_tax_no || null,
        phone: m.u_phone || null,
        landline_number: m.u_landline_number || null,
        language: m.language || null,
        date: m.date || null,
        web_site: m.u_web_site || null,
        bank: m.u_bank || null,
        iban: m.u_iban || null,
        bic: m.u_bic || null,
        bank_address: m.u_bank_address || null,

        // Document URLs
        trade_register: tradeRegisterUrl,
        travel_id: travelIdUrl,
        signature: signatureUrl,

        createdAt: broker.createdAt,
        updatedAt: broker.updatedAt,
      };
    });

    // 4️⃣ Response
    return res.status(200).json({
      success: true,
      message: "All Brokers data",
      data: {
        brokers: brokerData,
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching brokers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetAllBrokers;
