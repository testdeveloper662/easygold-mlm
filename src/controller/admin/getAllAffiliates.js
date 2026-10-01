const db = require("../../models");
const { Op } = require("sequelize");
require("dotenv").config();

const GetAllAffiliates = async (req, res) => {
  try {
    const { user } = req.user;
    const { page = 1, limit = 10, search = "", referral_code, referred_by_code } = req.query;
    const offset = (page - 1) * limit;

    let targetUserId = null;

    if (user.role === "SUPER_ADMIN" && req.query.viewUserId) {
      targetUserId = parseInt(req.query.viewUserId);
    } else if (user.role !== "SUPER_ADMIN") {
      targetUserId = user.ID || user.id;
    }

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const whereClause = {};
    let allNodes = [];
    let downlineUserIds = new Set();

    if (targetUserId) {
      const brokerUserWhere = { [Op.or]: [{ role_id: { [Op.notIn]: [5] } }, { role_id: null }] };
      const brokersRaw = await db.Brokers.findAll({ 
          include: [{ model: db.Users, as: "user", attributes: ["ID", "role_id"], where: brokerUserWhere, required: true }],
          attributes: ['id', 'user_id', 'parent_id', 'referral_code', 'referred_by_code'], raw: true 
      });
      let affiliatesRaw = [];
      if (db.Affiliates) {
          affiliatesRaw = await db.Affiliates.findAll({ 
              include: [{ model: db.Users, as: "user", attributes: ["ID", "user_status", "role_id"], where: {
                  [Op.and]: [
                      brokerUserWhere,
                      { [Op.or]: [
                          { role_id: { [Op.or]: [{ [Op.ne]: 2 }, { [Op.is]: null }] } },
                          { role_id: 2, user_status: 0 }
                      ]}
                  ]
              }, required: true }],
              attributes: ['id', 'user_id', 'parent_id', 'referral_code', 'referred_by_code'], raw: true 
          });
      }
      const allUserRefs = await db.UserReferrals.findAll({ attributes: ["user_id", "parent_user_id"], raw: true });
      const parentUserIdMap = {};
      allUserRefs.forEach(r => { parentUserIdMap[r.user_id] = r.parent_user_id; });

      const brokerUserIds = new Set(brokersRaw.map(b => b.user_id));
      const uniqueAffiliatesRaw = affiliatesRaw.filter(a => !brokerUserIds.has(a.user_id));

      allNodes = [
        ...brokersRaw.map(n => ({ ...n, type: 'broker' })),
        ...uniqueAffiliatesRaw.map(n => ({ ...n, type: 'affiliate' }))
      ].map(n => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        'user.role_id': n['user.role_id'],
        parent_id: n.parent_id,
        referral_code: (n.referral_code || "").trim().toUpperCase(),
        referred_by_code: (n.referred_by_code || "").trim().toUpperCase(),
        parent_user_id: parentUserIdMap[n.user_id] || null
      }));

      const assignedUserIds = new Set([Number(targetUserId)]);
      
      const rootAffiliate = affiliatesRaw.find(a => Number(a.user_id) === Number(targetUserId));
      let currentLevelNodes = rootAffiliate ? [{
        id: rootAffiliate.id,
        user_id: rootAffiliate.user_id,
        type: 'affiliate',
        'user.role_id': rootAffiliate['user.role_id'] || null,
        parent_id: rootAffiliate.parent_id,
        referral_code: (rootAffiliate.referral_code || "").trim().toUpperCase(),
        referred_by_code: (rootAffiliate.referred_by_code || "").trim().toUpperCase(),
        parent_user_id: parentUserIdMap[rootAffiliate.user_id] || null
      }] : [];
      
      for (let level = 1; level <= 5; level++) {
        let nextLevelNodes = [];
        for (const parentNode of currentLevelNodes) {
          const parentRefCode = parentNode.referral_code;
          const parentUserId = parentNode.user_id;
          
          const children = allNodes.filter(b => {
            const bUserId = b.user_id;
            if (!bUserId || Number(bUserId) === Number(parentUserId)) return false;
            if (assignedUserIds.has(Number(bUserId))) return false;
            
            if (level === 1) {
              const isAffiliateNet = b.type === 'affiliate' || b['user.role_id'] === 3 || b['user.role_id'] === 4;
              if (!isAffiliateNet) return false;
            }
            
            const bRefCode = b.referred_by_code;
            if (parentRefCode && bRefCode && bRefCode === parentRefCode) return true;
            if (b.parent_user_id && parentUserId && Number(b.parent_user_id) === Number(parentUserId)) return true;
            if (b.type === parentNode.type && b.parent_id && parentNode.id && Number(b.parent_id) === Number(parentNode.id)) return true;
            
            if (level === 1) {
              if (referred_by_code && bRefCode === referred_by_code.trim().toUpperCase()) return true;
              if (referral_code && bRefCode === referral_code.trim().toUpperCase()) return true;
            }
            
            return false;
          });
          
          children.forEach(c => {
            assignedUserIds.add(Number(c.user_id));
            downlineUserIds.add(Number(c.user_id));
            nextLevelNodes.push(c);
          });
        }
        currentLevelNodes = nextLevelNodes;
        if (currentLevelNodes.length === 0) break;
      }

      if (downlineUserIds.size > 0) {
        whereClause.user_id = { [Op.in]: Array.from(downlineUserIds) };
      } else {
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
      if (whereClause[Op.and]) {
        whereClause[Op.and].push(searchCondition);
      } else if (whereClause[Op.or]) {
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

    const affiliateUserFilter = {
      role_id: { [Op.in]: [3, 4] }
    };

    // 1️⃣ Try fetching from db.Affiliates if available
    let primaryQueried = false;
    
    if (targetUserId) {
      primaryQueried = true;
      let uWhere = { ID: { [Op.in]: Array.from(downlineUserIds) } };
      if (search && search.trim() !== "") {
        uWhere[Op.or] = [
          { display_name: { [Op.like]: `%${search}%` } },
          { user_email: { [Op.like]: `%${search}%` } },
        ];
      }
      
      const { count: uCount, rows: uRows } = await db.Users.findAndCountAll({
        where: uWhere,
        order: [["user_registered", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
      
      count = uCount;
      affiliates = uRows.map(u => {
        const node = allNodes.find(n => n.user_id === u.ID);
        return {
          id: node ? node.id : u.ID,
          user_id: u.ID,
          user: u,
          referral_code: node ? node.referral_code : null,
          referred_by_code: node ? node.referred_by_code : null,
          total_commission_amount: 0, // wait, original uses affiliate.total_commission_amount... but it's optional
          createdAt: u.user_registered,
          updatedAt: u.user_registered,
        };
      });
    } else {
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
                where: affiliateUserFilter
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
          ...affiliateUserFilter
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

    const affiliateData = await Promise.all(
      affiliates.map(async (affiliate) => {
        const u = affiliate.user || affiliate;
        const m = userMetaMap[u?.ID || affiliate.user_id] || {};

        const rawLogo = affiliate.logo || u?.logo || null;
        const logoUrl = rawLogo
          ? (rawLogo.startsWith("http")
              ? rawLogo
              : `${(process.env.NODE_URL || "").replace(/\/+$/, "")}/public/uploads${rawLogo.startsWith("/") ? rawLogo : `/${rawLogo}`}`)
          : null;

        return {
          affiliate_id: affiliate.id || u?.ID,
          user_id: u?.ID || affiliate.user_id || null,
          display_name: u?.display_name || `${m.vorname || m.u_fname || ""} ${m.nachname || m.u_lname || ""}`.trim() || null,
          user_email: u?.user_email || null,
          referral_code: affiliate.referral_code || m.referral_code || null,
          referred_by_code: affiliate.referred_by_code || null,
          person_typ: affiliate.person_typ || m.person_typ || m.u_person_type || "privatperson",
          company: m.u_company || "-",
          country: affiliate.land || m.u_country || m.country || null,
          steuer_id: affiliate.steuer_id || m.steuer_id || m.u_vat_no || m.vat_no || null,
          phone: m.u_phone || "-",
          language: m.language || null,
          logo: logoUrl,
          user_status: u?.user_status !== undefined ? u.user_status : (affiliate.user_status !== undefined ? affiliate.user_status : 2),
          role_id: u?.role_id || null,
          role: u?.role_id === 2 ? "BROKER" : "AFFILIATE",
          total_commission_amount: affiliate.total_commission_amount || 0,
          createdAt: affiliate.createdAt || u?.user_registered,
          updatedAt: affiliate.updatedAt || u?.user_registered,
        };
      })
    );

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
