const db = require("../../models");

const AddUpdateBrokerBankDetails = async (req, res) => {
    try {
        const user = req?.user?.user;
        const { ac_holder_name, iban, bic_swift_code, bank_name, banks, user_type = "broker" } = req.body;

        let targetUserId = user?.ID || user?.id;
        if (!targetUserId && user?.broker_id) {
            const b = await db.Brokers.findOne({ where: { id: user.broker_id }, attributes: ["user_id"] });
            if (b) targetUserId = b.user_id;
        }
        if (!targetUserId && user?.affiliate_id && db.Affiliates) {
            const a = await db.Affiliates.findOne({ where: { id: user.affiliate_id }, attributes: ["user_id"] });
            if (a) targetUserId = a.user_id;
        }

        if (!targetUserId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        let banksData;
        if (banks) {
            banksData = typeof banks === "string" ? banks : JSON.stringify(banks);
        } else {
            banksData = JSON.stringify({
                sepa: [
                    {
                        account_holder: ac_holder_name || "",
                        bank_name: bank_name || "",
                        iban: iban || "",
                        bic_swift: bic_swift_code || "",
                        bank_address: "",
                    },
                ],
                swift: [],
                ach: [],
            });
        }

        const targetMetaKey = user_type === "affiliate" ? "affiliate_banks" : "banks";

        const metaKeysToUpdate = [
            { key: targetMetaKey, value: banksData },
            ...(user_type === "broker" ? [
                ...(ac_holder_name ? [{ key: "ac_holder_name", value: ac_holder_name }] : []),
                ...(iban ? [{ key: "iban", value: iban }] : []),
                ...(bic_swift_code ? [{ key: "bic_swift_code", value: bic_swift_code }] : []),
                ...(bank_name ? [{ key: "bank_name", value: bank_name }] : []),
            ] : []),
        ];

        for (const item of metaKeysToUpdate) {
            const existingMeta = await db.UsersMeta.findOne({
                where: { user_id: targetUserId, meta_key: item.key },
            });

            if (existingMeta) {
                await existingMeta.update({ meta_value: item.value });
            } else {
                await db.UsersMeta.create({
                    user_id: targetUserId,
                    meta_key: item.key,
                    meta_value: item.value,
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: `${user_type === "affiliate" ? "Affiliate" : "Broker"} bank details updated successfully in user metadata.`,
            data: {
                user_id: targetUserId,
                banks: typeof banksData === "string" ? JSON.parse(banksData) : banksData,
                ac_holder_name,
                iban,
                bic_swift_code,
                bank_name,
            },
        });
    } catch (error) {
        console.error("Error in Add/Update Bank Details:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = AddUpdateBrokerBankDetails;
