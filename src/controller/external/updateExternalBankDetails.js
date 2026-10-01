const db = require("../../models");

const UpdateExternalBankDetails = async (req, res) => {
    try {
        const { email, ac_holder_name, iban, bic_swift_code, bank_name, banks } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        const user = await db.Users.findOne({ where: { user_email: email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email.",
            });
        }

        let targetUserId = user.ID;

        const bankDetailsData = {
            ac_holder_name: ac_holder_name || "",
            iban: iban || "",
            bic_swift_code: bic_swift_code || "",
            bank_name: bank_name || "",
            user_id: targetUserId,
            banks: banks ? (typeof banks === "string" ? banks : JSON.stringify(banks)) : null
        };

        // Also update UsersMeta for fallback
        let banksData = bankDetailsData.banks;
        if (!banksData) {
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

        const metaKeysToUpdate = [
            { key: "banks", value: banksData },
            ...(ac_holder_name ? [{ key: "ac_holder_name", value: ac_holder_name }] : []),
            ...(iban ? [{ key: "iban", value: iban }] : []),
            ...(bic_swift_code ? [{ key: "bic_swift_code", value: bic_swift_code }] : []),
            ...(bank_name ? [{ key: "bank_name", value: bank_name }] : [])
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
            message: "Bank details updated successfully.",
            data: {
                user_id: targetUserId,
                ac_holder_name,
                iban,
                bic_swift_code,
                bank_name,
            },
        });
    } catch (error) {
        console.error("Error in UpdateExternalBankDetails:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = UpdateExternalBankDetails;
