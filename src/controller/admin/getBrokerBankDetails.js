const db = require("../../models");

const GetBrokerBankDetails = async (req, res) => {
    try {
        const { brokerId } = req.params;

        if (!brokerId) {
            return res.status(400).json({
                success: false,
                message: "Broker ID is required.",
            });
        }

        const broker_id = parseInt(brokerId, 10);
        if (isNaN(broker_id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid broker ID.",
            });
        }

        let brokerDetails = await db.Brokers.findOne({
            where: { id: broker_id },
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "user_nicename", "user_login", "user_email", "display_name"],
                },
            ],
        });

        if (!brokerDetails && db.Affiliates) {
            brokerDetails = await db.Affiliates.findOne({
                where: { id: broker_id },
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["ID", "user_nicename", "user_login", "user_email", "display_name"],
                    },
                ],
            });
        }

        if (!brokerDetails) {
            return res.status(404).json({
                success: false,
                message: "Broker not found.",
            });
        }

        const targetUserId = brokerDetails.user_id || brokerDetails.user?.ID;
        const userMetaRows = targetUserId ? await db.UsersMeta.findAll({
            where: {
                user_id: targetUserId,
                meta_key: ["banks", "affiliate_banks", "ac_holder_name", "iban", "bic_swift_code", "bank_name", "u_account_owner"]
            },
        }) : [];

        const metaMap = {};
        userMetaRows.forEach(m => {
            metaMap[m.meta_key] = m.meta_value;
        });

        const rawBanks = metaMap.banks || metaMap.affiliate_banks;
        let parsedBanks = null;
        if (rawBanks) {
            try {
                parsedBanks = typeof rawBanks === "string" ? JSON.parse(rawBanks) : rawBanks;
            } catch (e) {
                console.error("Error parsing banks meta_value:", e);
            }
        }

        let primarySepa = {};
        let primarySwift = {};
        let primaryAch = {};

        if (Array.isArray(parsedBanks)) {
            primarySepa = parsedBanks[0] || {};
        } else if (parsedBanks && typeof parsedBanks === "object") {
            primarySepa = parsedBanks.sepa?.[0] || {};
            primarySwift = parsedBanks.swift?.[0] || {};
            primaryAch = parsedBanks.ach?.[0] || {};
        }

        const ac_holder_name = primarySepa.account_holder || primarySwift.account_holder || primaryAch.account_holder || metaMap.ac_holder_name || metaMap.u_account_owner || "";
        const iban = primarySepa.iban || primarySwift.iban || metaMap.iban || "";
        const bic_swift_code = primarySepa.bic_swift || primarySwift.swift_bic || metaMap.bic_swift_code || "";
        const bank_name = primarySepa.bank_name || primarySwift.bank_name || primaryAch.bank_name || metaMap.bank_name || "";

        return res.status(200).json({
            success: true,
            data: {
                ac_holder_name,
                iban,
                bic_swift_code,
                bank_name,
                banks: parsedBanks,
                broker: {
                    id: brokerDetails.id,
                    user_id: brokerDetails.user_id,
                    email: brokerDetails.user?.user_email,
                    name: brokerDetails.user?.display_name || brokerDetails.user?.user_nicename,
                }
            }
        });
    } catch (error) {
        console.error("Error in GetBrokerBankDetails (Admin):", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = GetBrokerBankDetails;

