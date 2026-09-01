const db = require("../../models");
const { getBrokerCommissionTotals, getAffiliateCommissionTotals } = require("../../utils/getBrokerCommissionTotals");

const GetBrokerBankDetails = async (req, res) => {
    try {
        const user = req?.user?.user;

        let broker_id;
        if (user?.role === "SUPER_ADMIN" && req.query.viewUserId) {
            const targetBroker = await db.Brokers.findOne({
                where: { user_id: parseInt(req.query.viewUserId) },
                attributes: ["id"],
            }) || (db.Affiliates ? await db.Affiliates.findOne({
                where: { user_id: parseInt(req.query.viewUserId) },
                attributes: ["id"],
            }) : null);
            broker_id = targetBroker?.id;
        } else {
            broker_id = user?.broker_id || user?.affiliate_id;
            if (!broker_id && user?.ID) {
                const b = await db.Brokers.findOne({ where: { user_id: user.ID }, attributes: ["id"] })
                       || (db.Affiliates ? await db.Affiliates.findOne({ where: { user_id: user.ID }, attributes: ["id"] }) : null);
                if (b) broker_id = b.id;
            }
        }

        if (!broker_id) {
            return res.status(400).json({
                success: false,
                message: "broker_id is required.",
            });
        }
        let brokerDetails = await db.Brokers.findOne({
            where: { id: broker_id },
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["ID", "user_nicename", "user_login"],
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
                        attributes: ["ID", "user_nicename", "user_login"],
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


        const targetUserId = brokerDetails?.user?.ID || brokerDetails?.user_id;
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

        const parseBanksObj = (raw, isAffiliate = false) => {
            let parsed = null;
            if (raw) {
                try {
                    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
                } catch (e) {}
            }

            let sepa = {};
            let swift = {};
            let ach = {};

            if (Array.isArray(parsed)) {
                sepa = parsed[0] || {};
            } else if (parsed && typeof parsed === "object") {
                sepa = parsed.sepa?.[0] || {};
                swift = parsed.swift?.[0] || {};
                ach = parsed.ach?.[0] || {};
            }

            const holder = sepa.account_holder || swift.account_holder || ach.account_holder || (!isAffiliate ? (metaMap.ac_holder_name || metaMap.u_account_owner || "") : "");
            const ibanVal = sepa.iban || swift.iban || (!isAffiliate ? (metaMap.iban || "") : "");
            const bicVal = sepa.bic_swift || swift.swift_bic || (!isAffiliate ? (metaMap.bic_swift_code || "") : "");
            const nameVal = sepa.bank_name || swift.bank_name || ach.bank_name || (!isAffiliate ? (metaMap.bank_name || "") : "");

            return { parsed, holder, iban: ibanVal, bic: bicVal, name: nameVal };
        };

        const brokerBankMeta = parseBanksObj(metaMap.banks, false);
        const affiliateBankMeta = parseBanksObj(metaMap.affiliate_banks, true);

        const commissionTotals = await getBrokerCommissionTotals(brokerDetails);
        const approvedPayouts = await db.BrokerPayoutRequests.findAll({
            where: {
                broker_id,
                status: "APPROVED"
            },
            attributes: [
                "payout_for",
                [db.Sequelize.fn("SUM", db.Sequelize.col("amount")), "total_amount"]
            ],
            group: ["payout_for"],
            raw: true
        });

        // Convert array → object (easy mapping)
        const payoutDeductMap = {
            EASYGOLD_TOKEN: 0,
            PRIMEINVEST: 0,
            GOLDFLEX: 0,
            B2B_DASHBOARD: 0
        };

        approvedPayouts.forEach(p => {
            payoutDeductMap[p.payout_for] = Number(p.total_amount || 0);
        });

        // -------------------------------------
        // 🔹 Subtract per-wallet for Broker
        // -------------------------------------
        const finalTotals = {
            EASYGOLD_TOKEN: commissionTotals.EASYGOLD_TOKEN - payoutDeductMap.EASYGOLD_TOKEN,
            PRIMEINVEST: commissionTotals.PRIMEINVEST - payoutDeductMap.PRIMEINVEST,
            GOLDFLEX: commissionTotals.GOLDFLEX - payoutDeductMap.GOLDFLEX,
            B2B_DASHBOARD: commissionTotals.B2B_DASHBOARD - payoutDeductMap.B2B_DASHBOARD,
        };

        // Prevent negative values
        Object.keys(finalTotals).forEach(key => {
            if (finalTotals[key] < 0) finalTotals[key] = 0;
        });

        // -------------------------------------
        // 🔹 Calculate Affiliate Commissions Totals & Payouts
        // -------------------------------------
        let aff_id = user?.affiliate_id;
        if (!aff_id && targetUserId && db.Affiliates) {
            const aff = await db.Affiliates.findOne({ where: { user_id: targetUserId }, attributes: ["id"] });
            if (aff) aff_id = aff.id;
        }
        if (!aff_id) aff_id = broker_id;

        const affiliateCommissionTotals = await getAffiliateCommissionTotals({ user: brokerDetails?.user, user_id: targetUserId, id: aff_id });
        const approvedAffiliatePayouts = (aff_id && db.AffiliatePayoutRequests) ? await db.AffiliatePayoutRequests.findAll({
            where: {
                affiliate_id: aff_id,
                status: "APPROVED"
            },
            attributes: [
                "payout_for",
                [db.Sequelize.fn("SUM", db.Sequelize.col("amount")), "total_amount"]
            ],
            group: ["payout_for"],
            raw: true
        }) : [];

        const affiliatePayoutDeductMap = {
            EASYGOLD_TOKEN: 0,
            PRIMEINVEST: 0,
            GOLDFLEX: 0,
            B2B_DASHBOARD: 0
        };

        approvedAffiliatePayouts.forEach(p => {
            affiliatePayoutDeductMap[p.payout_for] = Number(p.total_amount || 0);
        });

        const finalAffiliateTotals = {
            EASYGOLD_TOKEN: Math.max(0, affiliateCommissionTotals.EASYGOLD_TOKEN - affiliatePayoutDeductMap.EASYGOLD_TOKEN),
            PRIMEINVEST: Math.max(0, affiliateCommissionTotals.PRIMEINVEST - affiliatePayoutDeductMap.PRIMEINVEST),
            GOLDFLEX: Math.max(0, affiliateCommissionTotals.GOLDFLEX - affiliatePayoutDeductMap.GOLDFLEX),
            B2B_DASHBOARD: Math.max(0, affiliateCommissionTotals.B2B_DASHBOARD - affiliatePayoutDeductMap.B2B_DASHBOARD),
        };

        const bankDataObj = {
            ac_holder_name: brokerBankMeta.holder,
            iban: brokerBankMeta.iban,
            bic_swift_code: brokerBankMeta.bic,
            bank_name: brokerBankMeta.name,
            banks: brokerBankMeta.parsed,
        };

        const affiliateBankDataObj = (affiliateBankMeta.holder || affiliateBankMeta.iban || affiliateBankMeta.name || affiliateBankMeta.parsed) ? {
            ac_holder_name: affiliateBankMeta.holder,
            iban: affiliateBankMeta.iban,
            bic_swift_code: affiliateBankMeta.bic,
            bank_name: affiliateBankMeta.name,
            banks: affiliateBankMeta.parsed,
        } : null;

        const isAffiliateUser = user?.role === "AFFILIATE" || (req.query.viewUserId && !brokerDetails?.user_id);

        return res.status(200).json({
            success: true,
            data: {
                ...bankDataObj,
                affiliate_bank: affiliateBankDataObj,
                commissions_totals: isAffiliateUser ? finalAffiliateTotals : finalTotals,
                affiliate_commissions_totals: finalAffiliateTotals,
                broker_commissions_totals: finalTotals,
            }
        });
    } catch (error) {
        console.error("Error in GetBrokerBankDetails:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = GetBrokerBankDetails;
