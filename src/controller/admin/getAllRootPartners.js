const db = require("../../models");
const { Op } = require("sequelize");
require("dotenv").config();

const GetAllRootPartners = async (req, res) => {
  try {
    const { user } = req.user;

    // Only SUPER_ADMIN can access
    if (user.role !== "SUPER_ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Access not allowed",
      });
    }

    const {
      page = 1,
      limit = 10,
      search = "",
      type = "all", // "all" | "broker" | "affiliate"
      filterCode = "all", // "all" | "ESYGOLD916" | "ROOTPARTNER"
    } = req.query;

    // Compare with root / admin referral code from environment variables
    const adminEnvCode = (process.env.ADMIN_REFERRAL_CODE || "ROOTPARTNER").trim();
    const envCodes = (process.env.ROOT_PARTNER_CODES || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const rootCodes = Array.from(
      new Set(
        [
          "ESYGOLD916",
          "ROOTPARTNER",
          adminEnvCode,
          adminEnvCode.toUpperCase(),
          ...envCodes,
        ].filter(Boolean)
      )
    );

    // 1. Fetch brokers where referred_by_code IN ('ESYGOLD916', 'ROOTPARTNER') and parent_id IS NULL OR 0
    const brokers = await db.Brokers.findAll({
      where: {
        referred_by_code: { [Op.in]: rootCodes },
        [Op.or]: [{ parent_id: null }, { parent_id: 0 }],
      },
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["ID", "user_email", "display_name", "role_id", "user_status"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // 2. Fetch affiliates where referred_by_code IN ('ESYGOLD916', 'ROOTPARTNER') and parent_id IS NULL OR 0
    let affiliates = [];
    if (db.Affiliates) {
      affiliates = await db.Affiliates.findAll({
        where: {
          referred_by_code: { [Op.in]: rootCodes },
          [Op.or]: [{ parent_id: null }, { parent_id: 0 }],
        },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name", "role_id", "user_status"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    }

    // 3. Fetch user_referrals where referred_by_code IN ('ESYGOLD916', 'ROOTPARTNER') and parent_user_id IS NULL OR 0
    let userReferrals = [];
    if (db.UserReferrals) {
      userReferrals = await db.UserReferrals.findAll({
        where: {
          referred_by_code: { [Op.in]: rootCodes },
          [Op.or]: [{ parent_user_id: null }, { parent_user_id: 0 }],
        },
        include: [
          {
            model: db.Users,
            as: "user",
            attributes: ["ID", "user_email", "display_name", "role_id", "user_status"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    }

    // 4. Merge and deduplicate by user_id
    const partnersMap = new Map();

    // Add brokers first
    for (const b of brokers) {
      const u = b.user;
      const uid = b.user_id || u?.ID;
      if (!uid) continue;
      partnersMap.set(uid, {
        id: b.id,
        user_id: uid,
        type: "broker",
        partner_role: u?.role_id === 2 ? "Broker" : u?.role_id === 3 ? "Affiliate" : "Broker",
        role_id: u?.role_id || 2,
        user_status: u?.user_status ?? 1,
        display_name: u?.display_name || "",
        user_email: u?.user_email || "",
        referral_code: b.referral_code || "",
        referred_by_code: b.referred_by_code || "",
        parent_id: b.parent_id,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      });
    }

    // Add affiliates if not already present
    for (const a of affiliates) {
      const u = a.user;
      const uid = a.user_id || u?.ID;
      if (!uid) continue;
      if (!partnersMap.has(uid)) {
        partnersMap.set(uid, {
          id: a.id,
          user_id: uid,
          type: "affiliate",
          partner_role: u?.role_id === 2 ? "Broker" : "Affiliate",
          role_id: u?.role_id || 3,
          user_status: u?.user_status ?? 1,
          display_name: u?.display_name || "",
          user_email: u?.user_email || "",
          referral_code: a.referral_code || "",
          referred_by_code: a.referred_by_code || "",
          parent_id: a.parent_id,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        });
      }
    }

    // Add user_referrals if any unique root user exists
    for (const ur of userReferrals) {
      const u = ur.user;
      const uid = ur.user_id || u?.ID;
      if (!uid) continue;
      if (!partnersMap.has(uid)) {
        partnersMap.set(uid, {
          id: ur.id,
          user_id: uid,
          type: u?.role_id === 2 ? "broker" : "affiliate",
          partner_role: u?.role_id === 2 ? "Broker" : "Affiliate",
          role_id: u?.role_id || 3,
          user_status: u?.user_status ?? 1,
          display_name: u?.display_name || "",
          user_email: u?.user_email || "",
          referral_code: ur.referral_code || "",
          referred_by_code: ur.referred_by_code || "",
          parent_id: ur.parent_user_id,
          createdAt: ur.createdAt,
          updatedAt: ur.updatedAt,
        });
      }
    }

    const allPartners = Array.from(partnersMap.values());
    const userIds = allPartners.map((p) => p.user_id);

    // 5. Fetch user metadata
    let userMetaMap = {};
    if (userIds.length > 0) {
      const metas = await db.UsersMeta.findAll({
        where: {
          user_id: { [Op.in]: userIds },
          meta_key: {
            [Op.in]: [
              "u_company",
              "u_contact_person",
              "u_phone",
              "u_country",
              "u_location",
              "u_street",
              "u_postcode",
              "language",
              "person_typ",
              "user_role",
            ],
          },
        },
      });

      metas.forEach((meta) => {
        if (!userMetaMap[meta.user_id]) userMetaMap[meta.user_id] = {};
        userMetaMap[meta.user_id][meta.meta_key] = meta.meta_value;
      });
    }

    // Attach metadata to partners
    const enrichedPartners = allPartners.map((partner) => {
      const m = userMetaMap[partner.user_id] || {};
      return {
        ...partner,
        company: m.u_company || "-",
        contact_person: m.u_contact_person || "-",
        phone: m.u_phone || "-",
        country: m.u_country || "-",
        location: m.u_location || "-",
        street: m.u_street || "-",
        postcode: m.u_postcode || "-",
        language: m.language || "-",
        person_typ: m.person_typ || "-",
      };
    });

    // 6. Compute statistics across all root partners
    const totalRootPartners = enrichedPartners.length;
    const brokersCount = enrichedPartners.filter((p) => p.type === "broker").length;
    const affiliatesCount = enrichedPartners.filter((p) => p.type === "affiliate").length;
    const rootpartnerCount = enrichedPartners.filter((p) => {
      const code = (p.referred_by_code || "").trim().toUpperCase();
      return (
        code === adminEnvCode.toUpperCase() ||
        code === "ROOTPARTNER"
      );
    }).length;
    const esygoldCount = enrichedPartners.filter(
      (p) => (p.referred_by_code || "").trim().toUpperCase() === "ESYGOLD916"
    ).length;

    // 7. Filter
    let filtered = enrichedPartners;

    if (type && type !== "all") {
      filtered = filtered.filter((p) => p.type.toLowerCase() === type.toLowerCase());
    }

    if (filterCode && filterCode !== "all") {
      const target = filterCode.trim().toUpperCase();
      filtered = filtered.filter((p) => {
        const code = (p.referred_by_code || "").trim().toUpperCase();
        if (target === "ROOTPARTNER" || target === adminEnvCode.toUpperCase()) {
          return code === "ROOTPARTNER" || code === adminEnvCode.toUpperCase();
        }
        return code === target;
      });
    }

    if (search && search.trim() !== "") {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          (p.display_name && p.display_name.toLowerCase().includes(q)) ||
          (p.user_email && p.user_email.toLowerCase().includes(q)) ||
          (p.referral_code && p.referral_code.toLowerCase().includes(q)) ||
          (p.referred_by_code && p.referred_by_code.toLowerCase().includes(q)) ||
          (p.company && p.company.toLowerCase().includes(q)) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.country && p.country.toLowerCase().includes(q))
        );
      });
    }

    // Sort by createdAt DESC
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 8. Paginate
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;
    const paginatedPartners = filtered.slice(offset, offset + limitNum);

    return res.status(200).json({
      success: true,
      message: "Root partners fetched successfully",
      data: {
        partners: paginatedPartners,
        total: filtered.length,
        currentPage: pageNum,
        totalPages: Math.ceil(filtered.length / limitNum) || 1,
        stats: {
          totalRootPartners,
          brokersCount,
          affiliatesCount,
          rootpartnerCount,
          esygoldCount,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching root partners:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetAllRootPartners;

