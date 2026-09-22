const db = require("../../models");
const { Op } = require("sequelize");

const GetAllCustomerContract = async (req, res) => {
    try {
        const { user } = req.user;

        if (user.role !== "SUPER_ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only admins can view all target customers.",
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";

        const whereClause = {
            pdf_url: {
                [Op.ne]: null,
            },
        };

        const includeConfig = [
            {
                model: db.Brokers,
                as: "broker",
                attributes: ["id", "user_id", "referral_code"],
                required: false,
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["ID", "user_email", "display_name"],
                        required: false,
                    },
                ],
            },
            {
                model: db.UserReferrals,
                as: "user_referral",
                attributes: ["id", "user_id", "referral_code"],
                required: false,
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["ID", "user_email", "display_name"],
                        required: false,
                    },
                ],
            },
        ];

        // ✅ GLOBAL SEARCH (customer + broker + user_referral + user)
        if (search) {
            whereClause[Op.or] = [
                { customer_name: { [Op.like]: `%${search}%` } },
                { customer_email: { [Op.like]: `%${search}%` } },
                { "$broker.referral_code$": { [Op.like]: `%${search}%` } },
                { "$broker.user.user_email$": { [Op.like]: `%${search}%` } },
                { "$broker.user.display_name$": { [Op.like]: `%${search}%` } },
                { "$user_referral.referral_code$": { [Op.like]: `%${search}%` } },
                { "$user_referral.user.user_email$": { [Op.like]: `%${search}%` } },
                { "$user_referral.user.display_name$": { [Op.like]: `%${search}%` } },
            ];
        }

        // ✅ FIXED COUNT QUERY
        const totalCount = await db.TargetCustomers.count({
            where: whereClause,
            include: includeConfig,   // 🔥 REQUIRED
            distinct: true,           // 🔥 REQUIRED
        });

        // ✅ MAIN QUERY
        const targetCustomers = await db.TargetCustomers.findAll({
            where: whereClause,
            include: includeConfig,
            order: [["createdAt", "DESC"]],
            limit,
            offset,
            subQuery: false, // 🔥 IMPORTANT for nested search
        });

        // Batch resolve person_name for customers missing broker user details
        const parentUserIds = new Set();
        const referredByCodes = new Set();

        targetCustomers.forEach(c => {
            if (c.referred_by_code) referredByCodes.add(c.referred_by_code);
            if (c.user_referral?.referred_by_code) referredByCodes.add(c.user_referral.referred_by_code);
            if (c.user_referral?.parent_user_id) parentUserIds.add(c.user_referral.parent_user_id);
        });

        const usersByParentId = {};
        if (parentUserIds.size > 0) {
            const parentUsers = await db.Users.findAll({
                where: { ID: Array.from(parentUserIds) },
                attributes: ["ID", "display_name", "user_email"],
            });
            parentUsers.forEach(u => { usersByParentId[u.ID] = u; });
        }

        const usersByRefCode = {};
        if (referredByCodes.size > 0) {
            const refRecords = await db.UserReferrals.findAll({
                where: { referral_code: Array.from(referredByCodes) },
                include: [{ model: db.Users, as: "user", attributes: ["ID", "display_name", "user_email"] }],
            });
            refRecords.forEach(r => {
                if (r.user) usersByRefCode[r.referral_code] = r.user;
            });

            const brokerRecords = await db.Brokers.findAll({
                where: { referral_code: Array.from(referredByCodes) },
                include: [{ model: db.Users, as: "user", attributes: ["ID", "display_name", "user_email"] }],
            });
            brokerRecords.forEach(b => {
                if (b.user) usersByRefCode[b.referral_code] = b.user;
            });
        }

        const customersWithPersonName = targetCustomers.map(c => {
            const customer = c.toJSON();

            let personName = "";
            let personEmail = "";

            // 1. Try broker user
            if (customer.broker && customer.broker.user) {
                personName = customer.broker.user.display_name || "";
                personEmail = customer.broker.user.user_email || "";
            }

            // 2. Try user_referral (if user is NOT the customer themselves)
            if (!personName && customer.user_referral && customer.user_referral.user) {
                if (customer.user_referral.user.user_email !== customer.customer_email) {
                    personName = customer.user_referral.user.display_name || "";
                    personEmail = customer.user_referral.user.user_email || "";
                }
            }

            // 3. Try parent_user_id from user_referral
            if (!personName && customer.user_referral && customer.user_referral.parent_user_id && usersByParentId[customer.user_referral.parent_user_id]) {
                const pu = usersByParentId[customer.user_referral.parent_user_id];
                personName = pu.display_name || "";
                personEmail = pu.user_email || "";
            }

            // 4. Try referred_by_code
            const refCode = customer.referred_by_code || customer.user_referral?.referred_by_code;
            if (!personName && refCode && usersByRefCode[refCode]) {
                const ru = usersByRefCode[refCode];
                personName = ru.display_name || "";
                personEmail = ru.user_email || "";
            }

            if (customer.pdf_url) {
                customer.pdf_url = `${process.env.NODE_URL}${customer.pdf_url}`;
            }

            customer.person_name = personName;
            customer.person_email = personEmail;
            customer.broker_name = personName; // backward compatibility
            customer.person = {
                name: personName,
                email: personEmail,
                referral_code: customer.referred_by_code || customer.user_referral?.referral_code || customer.broker?.referral_code || null,
            };

            return customer;
        });

        return res.status(200).json({
            success: true,
            message: "All target customers retrieved successfully",
            data: {
                customers: customersWithPersonName,
                total: totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                limit,
            },
        });

    } catch (error) {
        console.error("Error fetching all target customers:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = GetAllCustomerContract;