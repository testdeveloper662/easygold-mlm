const db = require("../../models");
const { Op } = require("sequelize");
require("dotenv").config();

const GetAllBrokers = async (req, res) => {
    try {
        const { user } = req.user;

        const { page = 1, limit = 10, search = "" } = req.query;
        const offset = (page - 1) * limit;

        console.log(search, "search term in get all brokers");

        let targetUserId = null;
        if (user.role === "SUPER_ADMIN" && req.query.viewUserId) {
            targetUserId = parseInt(req.query.viewUserId);
        } else if (user.role !== "SUPER_ADMIN") {
            targetUserId = user.ID || user.id;
        }

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
            
            const rootBroker = brokersRaw.find(b => Number(b.user_id) === Number(targetUserId));
            let currentLevelNodes = rootBroker ? [{
                id: rootBroker.id,
                user_id: rootBroker.user_id,
                type: 'broker',
                'user.role_id': rootBroker['user.role_id'] || null,
                parent_id: rootBroker.parent_id,
                referral_code: (rootBroker.referral_code || "").trim().toUpperCase(),
                referred_by_code: (rootBroker.referred_by_code || "").trim().toUpperCase(),
                parent_user_id: parentUserIdMap[rootBroker.user_id] || null
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
                            if (isAffiliateNet) return false;
                        }
                        
                        const bRefCode = b.referred_by_code;
                        if (parentRefCode && bRefCode && bRefCode === parentRefCode) return true;
                        if (b.parent_user_id && parentUserId && Number(b.parent_user_id) === Number(parentUserId)) return true;
                        if (b.type === parentNode.type && b.parent_id && parentNode.id && Number(b.parent_id) === Number(parentNode.id)) return true;
                        
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

        if (search) {
            whereClause[Op.or] = [
                { "$user.display_name$": { [Op.like]: `%${search}%` } },
                { "$user.user_email$": { [Op.like]: `%${search}%` } },
                { "$user.user_meta.meta_value$": { [Op.like]: `%${search}%` } },
            ];
        }

        // 1️⃣ Get paginated brokers with their user info
        let count = 0;
        let brokers = [];

        if (targetUserId) {
            let uWhere = { ID: { [Op.in]: Array.from(downlineUserIds) } };
            if (search) {
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
            brokers = uRows.map(u => {
                const node = allNodes.find(n => n.user_id === u.ID);
                return {
                    id: node ? node.id : u.ID,
                    user_id: u.ID,
                    user: u,
                    referral_code: node ? node.referral_code : null,
                    createdAt: u.user_registered,
                    updatedAt: u.user_registered
                };
            });
        } else {
            const result = await db.Brokers.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["ID", "user_email", "display_name", "role_id"],
                        where: {
                            role_id: 2
                        },
                        required: true,
                        include: [
                            {
                                model: db.UsersMeta,
                                as: "user_meta",
                                attributes: [],
                                where: {
                                    meta_key: "u_company",
                                },
                                required: false,
                            },
                        ],
                    },
                ],
                distinct: true,
                subQuery: false,
                order: [["id", "DESC"]],
                limit: parseInt(limit),
                offset: parseInt(offset),
            });
            count = result.count;
            brokers = result.rows;
        }

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
                        "banks",
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

            const untermaklervertrag_doc = broker.untermaklervertrag_doc ? `${process.env.NODE_URL}${broker.untermaklervertrag_doc}` : null;
            const maklervertrag_doc = broker.maklervertrag_doc ? `${process.env.NODE_URL}${broker.maklervertrag_doc}` : null;
            const inc_partnership_doc = broker.inc_partnership_doc ? `${process.env.NODE_URL}${broker.inc_partnership_doc}` : null;
            const llc_partnership_doc = broker.llc_partnership_doc ? `${process.env.NODE_URL}${broker.llc_partnership_doc}` : null;
            const goldflex_partnership_doc = broker.goldflex_partnership_doc ? `${process.env.NODE_URL}${broker.goldflex_partnership_doc}` : null;
            const hartmann_benz_gmbh_doc = broker.hartmann_benz_gmbh_doc ? `${process.env.NODE_URL}${broker.hartmann_benz_gmbh_doc}` : null;
            const binding_loi_doc = broker.binding_loi_doc ? `${process.env.NODE_URL}${broker.binding_loi_doc}` : null;
            const partner_tax_billing_doc = broker.partner_tax_billing_doc ? `${process.env.NODE_URL}${broker.partner_tax_billing_doc}` : null;
            const uk_company_sales_platform_doc = broker.uk_company_sales_platform_doc ? `${process.env.NODE_URL}${broker.uk_company_sales_platform_doc}` : null;
            const ncnda_doc = broker.ncnda_doc ? `${process.env.NODE_URL}${broker.ncnda_doc}` : null;
            const option_subscription_doc = broker.option_subscription_doc ? `${process.env.NODE_URL}${broker.option_subscription_doc}` : null;

            // Construct public URLs if exist
            // const tradeRegisterUrl = m.u_trade_register
            //     ? `${process.env.PUBLIC_URL}${m.u_trade_register}`
            //     : null;
            // const travelIdUrl = m.u_travel_id
            //     ? `${process.env.PUBLIC_URL}${m.u_travel_id}`
            //     : null;
            // const signatureUrl = m.signatureData
            //     ? `${process.env.PUBLIC_URL}${m.signatureData}`
            //     : null;

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
                banks: m.banks ? (() => { try { return JSON.parse(m.banks); } catch { return null; } })() : null,

                // Document URLs
                maklervertrag_doc: maklervertrag_doc,
                untermaklervertrag_doc: untermaklervertrag_doc,
                inc_partnership_doc: inc_partnership_doc,
                llc_partnership_doc: llc_partnership_doc,
                goldflex_partnership_doc: goldflex_partnership_doc,
                hartmann_benz_gmbh_doc: hartmann_benz_gmbh_doc,
                binding_loi_doc: binding_loi_doc,
                partner_tax_billing_doc: partner_tax_billing_doc,
                uk_company_sales_platform_doc: uk_company_sales_platform_doc,
                ncnda_doc: ncnda_doc,
                option_subscription_doc: option_subscription_doc,

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
