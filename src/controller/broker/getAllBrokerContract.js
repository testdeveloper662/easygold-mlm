// ✅ ONE CONTRACT = ONE ENTRY

const db = require("../../models");
const { Op } = require("sequelize");
require("dotenv").config();

const GetAllBrokerContract = async (req, res) => {
    try {
        const { user } = req.user;

        // Only SUPER_ADMIN can access
        if (user.role == "SUPER_ADMIN") {
            return res.status(400).json({
                success: false,
                message: "Access not allowed",
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";

        const whereClause = {
            parent_id: user.broker_id,
        };

        // ✅ Search
        if (search) {
            whereClause[Op.or] = [
                { referral_code: { [Op.like]: `%${search}%` } },
                { "$user.display_name$": { [Op.like]: `%${search}%` } },
                { "$user.user_email$": { [Op.like]: `%${search}%` } },
            ];
        }

        // ✅ Fetch brokers
        const brokers = await db.Brokers.findAll({
            where: whereClause,
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "display_name", "user_email"],
                },
            ],
            order: [["createdAt", "DESC"]],
            subQuery: false,
        });

        // ✅ One contract = one row
        let contractList = [];

        brokers.forEach((broker) => {
            const contracts = [
                {
                    key: "untermaklervertrag_doc",
                    label: "Untermaklervertrag",
                },
                {
                    key: "maklervertrag_doc",
                    label: "Maklervertrag",
                },
                {
                    key: "inc_partnership_doc",
                    label: "INC Partnership",
                },
                {
                    key: "llc_partnership_doc",
                    label: "LLC Partnership",
                },
                {
                    key: "goldflex_partnership_doc",
                    label: "Goldflex Partnership",
                },
                {
                    key: "hartmann_benz_gmbh_doc",
                    label: "Hartmann Benz GmbH",
                },
                {
                    key: "binding_loi_doc",
                    label: "Binding LOI",
                },
                {
                    key: "partner_tax_billing_doc",
                    label: "Partner Tax Billing",
                },
                {
                    key: "uk_company_sales_platform_doc",
                    label: "UK Company Sales Platform",
                },
            ];

            contracts.forEach((contract) => {
                if (broker[contract.key]) {
                    contractList.push({
                        broker_id: broker.id,
                        referral_code: broker.referral_code,
                        display_name: broker.user?.display_name || null,
                        user_email: broker.user?.user_email || null,

                        contract_type: contract.label,
                        contract_key: contract.key,
                        contract_url: `${process.env.NODE_URL}${broker[contract.key]}`,

                        createdAt: broker.createdAt,
                        updatedAt: broker.updatedAt,
                    });
                }
            });
        });

        // ✅ Pagination after flattening
        const total = contractList.length;

        contractList = contractList.slice(offset, offset + limit);

        return res.status(200).json({
            success: true,
            message: "Broker contracts fetched successfully",
            data: {
                contracts: contractList,
                total,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                limit,
            },
        });

    } catch (error) {
        console.error("Error fetching broker contracts:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

module.exports = GetAllBrokerContract;