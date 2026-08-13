const db = require("../../models");
const { Op } = require("sequelize");
require("dotenv").config();

const GetAllAffiliates = async (req, res) => {
  try {
    const { user } = req.user;
    const { page = 1, limit = 10, search = "", referral_code, referred_by_code } = req.query;
    const offset = (page - 1) * limit;

    const targetParentIds = new Set();
    const targetRefCodes = new Set();

    if (referred_by_code) targetRefCodes.add(referred_by_code);
    if (referral_code) targetRefCodes.add(referral_code);

    if (user.role === "SUPER_ADMIN" && req.query.viewUserId) {
      const vUserId = parseInt(req.query.viewUserId);
      const bRec = await db.Brokers.findOne({ where: { user_id: vUserId } });
      if (bRec) {
        if (bRec.id) targetParentIds.add(bRec.id);
        if (bRec.referral_code) targetRefCodes.add(bRec.referral_code);
      }
      if (db.Affiliates) {
        const aRec = await db.Affiliates.findOne({ where: { user_id: vUserId } });
        if (aRec) {
          if (aRec.id) targetParentIds.add(aRec.id);
          if (aRec.referral_code) targetRefCodes.add(aRec.referral_code);
        }
      }
    } else if (user.role !== "SUPER_ADMIN") {
      const loggedUserId = user.ID || user.id;
      const bRec = await db.Brokers.findOne({ where: { user_id: loggedUserId } });
      if (bRec) {
        if (bRec.id) targetParentIds.add(bRec.id);
        if (bRec.referral_code) targetRefCodes.add(bRec.referral_code);
      }
      if (db.Affiliates) {
        const aRec = await db.Affiliates.findOne({ where: { user_id: loggedUserId } });
        if (aRec) {
          if (aRec.id) targetParentIds.add(aRec.id);
          if (aRec.referral_code) targetRefCodes.add(aRec.referral_code);
        }
      }
    }

    const whereClause = {};

    if (user.role !== "SUPER_ADMIN" || targetRefCodes.size > 0 || targetParentIds.size > 0) {
      const orConditions = [];

      // Prioritize referred_by_code as referral codes are unique across tables
      if (targetRefCodes.size > 0) {
        orConditions.push({ referred_by_code: { [Op.in]: Array.from(targetRefCodes) } });
      }
      if (targetParentIds.size > 0) {
        orConditions.push({ parent_id: { [Op.in]: Array.from(targetParentIds) } });
      }

      if (orConditions.length > 0) {
        whereClause[Op.or] = orConditions;
      } else {
        // If non-admin user has no referral code or ID, return no results
        whereClause.id = -1;
      }
    }

    if (search && search.trim() !== "") {
      const searchCondition = {
        [Op.or]: [
          { "$user.display_name$": { [Op.like]: `%${search}%` } },
          { "$user.user_email$": { [Op.like]: `%${search}%` } },
        ],
      };
      if (whereClause[Op.or]) {
        whereClause[Op.and] = [
          { [Op.or]: whereClause[Op.or] },
          searchCondition,
        ];
        delete whereClause[Op.or];
      } else {
        whereClause[Op.and] = [searchCondition];
      }
    }

    let count = 0;
    let affiliates = [];

    // 1️⃣ Try fetching from db.Affiliates if available
    let primaryQueried = false;
    try {
      if (db.Affiliates) {
        primaryQueried = true;
        const result = await db.Affiliates.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: db.Users,
              as: "user",
              attributes: ["ID", "user_email", "display_name", "user_status", "role_id"],
              required: true,
              where: {
                [Op.or]: [
                  { role_id: { [Op.or]: [{ [Op.ne]: 2 }, { [Op.is]: null }] } },
                  { role_id: 2, user_status: 0 }
                ]
              }
            },
          ],
          distinct: true,
          subQuery: false,
          order: [["createdAt", "DESC"]],
          limit: parseInt(limit),
          offset: parseInt(offset),
        });
        count = result.count;
        affiliates = result.rows;
      }
    } catch (affErr) {
      console.warn("db.Affiliates table query failed, falling back to UsersMeta:", affErr.message);
      affiliates = [];
      primaryQueried = false;
    }

    // 2️⃣ Fallback to db.UsersMeta ONLY if db.Affiliates query was not performed (e.g. model unavailable/failed)
    if (!primaryQueried) {
      const affiliateMetas = await db.UsersMeta.findAll({
        where: {
          meta_key: "user_role",
          meta_value: "AFFILIATE",
        },
        attributes: ["user_id"],
      });

      const affiliateUserIds = affiliateMetas.map((m) => m.user_id);

      if (affiliateUserIds.length > 0) {
        const userWhere = {
          ID: { [Op.in]: affiliateUserIds },
          [Op.or]: [
            { role_id: { [Op.or]: [{ [Op.ne]: 2 }, { [Op.is]: null }] } },
            { role_id: 2, user_status: 0 }
          ]
        };

        if (search && search.trim() !== "") {
          const searchCondition = {
            [Op.or]: [
              { display_name: { [Op.like]: `%${search}%` } },
              { user_email: { [Op.like]: `%${search}%` } },
            ]
          };
          userWhere[Op.and] = [searchCondition];
        }

        const { count: uCount, rows: uRows } = await db.Users.findAndCountAll({
          where: userWhere,
          order: [["user_registered", "DESC"]],
          limit: parseInt(limit),
          offset: parseInt(offset),
        });

        count = uCount;
        affiliates = uRows.map((u) => ({
          id: u.ID,
          user_id: u.ID,
          user: u,
          referral_code: null,
          total_commission_amount: 0,
          createdAt: u.user_registered,
          updatedAt: u.user_registered,
        }));
      }
    }

    const userIds = affiliates.map((a) => a.user_id);

    const metas = await db.UsersMeta.findAll({
      where: {
        user_id: {
          [Op.in]: userIds,
        },
        meta_key: {
          [Op.in]: [
            "vorname",
            "u_fname",
            "nachname",
            "u_lname",
            "person_typ",
            "u_person_type",
            "country",
            "u_country",
            "steuer_id",
            "u_vat_no",
            "vat_no",
            "language",
            "u_company",
            "u_phone",
            "referral_code",
          ],
        },
      },
    });

    const userMetaMap = {};
    metas.forEach((meta) => {
      if (!userMetaMap[meta.user_id]) userMetaMap[meta.user_id] = {};
      userMetaMap[meta.user_id][meta.meta_key] = meta.meta_value;
    });

    const affiliateData = affiliates.map((affiliate) => {
      const u = affiliate.user || affiliate;
      const m = userMetaMap[u?.ID || affiliate.user_id] || {};

      return {
        affiliate_id: affiliate.id || u?.ID,
        user_id: u?.ID || affiliate.user_id || null,
        display_name: u?.display_name || `${m.vorname || m.u_fname || ""} ${m.nachname || m.u_lname || ""}`.trim() || null,
        user_email: u?.user_email || null,
        referral_code: affiliate.referral_code || m.referral_code || null,
        referred_by_code: affiliate.referred_by_code || null,
        person_typ: affiliate.person_typ || m.person_typ || m.u_person_type || "privatperson",
        company: m.u_company || null,
        country: affiliate.land || m.u_country || m.country || null,
        steuer_id: affiliate.steuer_id || m.steuer_id || m.u_vat_no || m.vat_no || null,
        phone: m.u_phone || null,
        language: m.language || null,
        user_status: u?.user_status !== undefined ? u.user_status : (affiliate.user_status !== undefined ? affiliate.user_status : 2),
        role_id: u?.role_id || null,
        role: u?.role_id === 2 ? "BROKER" : "AFFILIATE",
        total_commission_amount: affiliate.total_commission_amount || 0,
        createdAt: affiliate.createdAt || u?.user_registered,
        updatedAt: affiliate.updatedAt || u?.user_registered,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Affiliates data fetched successfully",
      data: {
        affiliates: affiliateData,
        brokers: affiliateData,
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit || 1),
      },
    });
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = GetAllAffiliates;
