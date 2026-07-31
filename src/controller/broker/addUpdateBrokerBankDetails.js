const db = require("../../models");

const AddUpdateBrokerBankDetails = async (req, res) => {
    try {
        const user = req?.user?.user;
        const { ac_holder_name, iban, bic_swift_code, bank_name, user_type = "broker" } = req.body;

        if (user_type === "affiliate") {
            let affiliate_id = user?.affiliate_id;
            if (!affiliate_id && user?.ID && db.Affiliates) {
                const aff = await db.Affiliates.findOne({ where: { user_id: user.ID }, attributes: ["id"] });
                if (aff) affiliate_id = aff.id;
            }
            if (!affiliate_id && user?.broker_id && db.Brokers) {
                // If logged in as broker updating affiliate bank details
                const brokerObj = await db.Brokers.findOne({ where: { id: user.broker_id }, attributes: ["id", "user_id"] });
                if (brokerObj) {
                    const aff = await db.Affiliates.findOne({ where: { user_id: brokerObj.user_id }, attributes: ["id"] });
                    if (aff) affiliate_id = aff.id;
                }
            }

            if (!affiliate_id) {
                // Fallback to broker_id if affiliate record not separate
                affiliate_id = user?.broker_id;
            }

            if (!affiliate_id) {
                return res.status(400).json({
                    success: false,
                    message: "affiliate_id is required.",
                });
            }

            const existingAff = await db.AffiliateBankDetails.findOne({
                where: { affiliate_id },
            });

            if (existingAff) {
                await existingAff.update({
                    ac_holder_name,
                    iban,
                    bic_swift_code,
                    bank_name,
                });
                return res.status(200).json({
                    success: true,
                    message: "Affiliate bank details updated successfully.",
                    data: existingAff,
                });
            }

            const newAffDetails = await db.AffiliateBankDetails.create({
                affiliate_id,
                ac_holder_name,
                iban,
                bic_swift_code,
                bank_name,
            });

            return res.status(200).json({
                success: true,
                message: "Affiliate bank details added successfully.",
                data: newAffDetails,
            });
        }

        // Default: Broker Bank Details
        let broker_id = user?.broker_id;
        if (!broker_id && user?.ID) {
            const b = await db.Brokers.findOne({ where: { user_id: user.ID }, attributes: ["id"] });
            if (b) broker_id = b.id;
        }

        if (!broker_id) {
            return res.status(400).json({
                success: false,
                message: "broker_id is required.",
            });
        }

        const existing = await db.BrokerBankDetails.findOne({
            where: { broker_id },
        });

        if (existing) {
            await existing.update({
                ac_holder_name,
                iban,
                bic_swift_code,
                bank_name,
            });

            return res.status(200).json({
                success: true,
                message: "Broker bank details updated successfully.",
                data: existing,
            });
        }

        const newDetails = await db.BrokerBankDetails.create({
            broker_id,
            ac_holder_name,
            iban,
            bic_swift_code,
            bank_name,
        });

        return res.status(200).json({
            success: true,
            message: "Broker bank details added successfully.",
            data: newDetails,
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
