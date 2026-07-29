const db = require("../../models");

const AddUpdateBrokerBankDetails = async (req, res) => {
    try {
        const user = req?.user?.user;
        let broker_id = user?.broker_id || user?.affiliate_id;
        if (!broker_id && user?.ID) {
            const b = await db.Brokers.findOne({ where: { user_id: user.ID }, attributes: ["id"] })
                   || (db.Affiliates ? await db.Affiliates.findOne({ where: { user_id: user.ID }, attributes: ["id"] }) : null);
            if (b) broker_id = b.id;
        }

        if (!broker_id) {
            return res.status(400).json({
                success: false,
                message: "broker_id is required.",
            });
        }
        let brokerDetails = await db.Brokers.findOne({
            where: { id: broker_id },
        });

        if (!brokerDetails && db.Affiliates) {
            brokerDetails = await db.Affiliates.findOne({
                where: { id: broker_id },
            });
        }

        if (!brokerDetails) {
            return res.status(404).json({
                success: false,
                message: "Broker not found.",
            });
        }

        const { ac_holder_name, iban, bic_swift_code, bank_name } = req.body;

        // Check existing bank details
        const existing = await db.BrokerBankDetails.findOne({
            where: { broker_id },
        });

        if (existing) {
            // Update
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

        // Create new
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
        console.error("Error in Add/Update Broker Bank Details:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

module.exports = AddUpdateBrokerBankDetails;
