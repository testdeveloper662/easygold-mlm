const db = require("../../models");
const { Op } = require("sequelize");
require("dotenv").config();

const GetAllAffiliates = async (req, res) => {
  try {
    const { user } = req.user;
    const { page = 1, limit = 10, search = "", referral_code, referred_by_code } = req.query;
    const offset = (page - 1) * limit;

    let targetBrokerId = null;
    let targetReferralCode = referred_by_code || referral_code || null;

    if (user.role === "SUPER_ADMIN" && req.query.viewUserId) {
      const targetUser = await db.Brokers.findOne({
        where: { user_id: parseInt(req.query.viewUserId) },
        attributes: ["id", "referral_code"],
      }) || (db.Affiliates ? await db.Affiliates.findOne({
        where: { user_id: parseInt(req.query.viewUserId) },
        attributes: ["id", "referral_code"],
      }) : null);

      if (targetUser) {
        targetBrokerId = targetUser.id;
        targetReferralCode = targetReferralCode || targetUser.referral_code;
      }
    } else if (user.role !== "SUPER_ADMIN") {
      targetBrokerId = user.broker_id || null;
      targetReferralCode = targetReferralCode || user.referral_code;

      if (!targetBrokerId || !targetReferralCode) {
        const brokerRec = await db.Brokers.findOne({ where: { user_id: user.ID } });
        if (brokerRec) {
          targetBrokerId = brokerRec.id;
          targetReferralCode = targetReferralCode || brokerRec.referral_code;
        }
        if (db.Affiliates) {
          const affRec = await db.Affiliates.findOne({ where: { user_id: user.ID } });
          if (affRec) {
            targetBrokerId = targetBrokerId || affRec.id;
            targetReferralCode = targetReferralCode || affRec.referral_code;
          }
        }
      }
    }

    const whereClause = {};

    if (user.role !== "SUPER_ADMIN" || targetBrokerId || targetReferralCode) {
      const orConditions = [];
      if (targetBrokerId) {
        orConditions.push({ parent_id: targetBrokerId });
      }
      if (targetReferralCode) {
        orConditions.push({ referred_by_code: targetReferralCode });
      }
      if (orConditions.length > 0) {
        whereClause[Op.or] = orConditions;
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
    try {
      if (db.Affiliates) {
        const result = await db.Affiliates.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: db.Users,
              as: "user",
              attributes: ["ID", "user_email", "display_name"],
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
    }

    // 2️⃣ Fallback to db.UsersMeta with user_role = 'AFFILIATE' if db.Affiliates is empty or failed
    if (affiliates.length === 0) {
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
        };

        if (search && search.trim() !== "") {
          userWhere[Op.or] = [
            { display_name: { [Op.like]: `%${search}%` } },
            { user_email: { [Op.like]: `%${search}%` } },
          ];
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
            "nachname",
            "person_typ",
            "country",
            "u_country",
            "steuer_id",
            "language",
            "u_company",
            "u_phone",
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
        display_name: u?.display_name || `${m.vorname || ""} ${m.nachname || ""}`.trim() || null,
        user_email: u?.user_email || null,
        referral_code: affiliate.referral_code || null,
        referred_by_code: affiliate.referred_by_code || null,
        person_typ: affiliate.person_typ || m.person_typ || "privatperson",
        company: m.u_company || null,
        country: affiliate.land || m.u_country || m.country || null,
        steuer_id: affiliate.steuer_id || m.steuer_id || null,
        phone: m.u_phone || null,
        language: m.language || null,
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
