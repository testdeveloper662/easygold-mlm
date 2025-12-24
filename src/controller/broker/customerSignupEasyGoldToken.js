const db = require("../../models");
const { sequelize } = require("../../config/database");

const customerSignupEasyGoldToken = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            customer_name,
            customer_email,
            referred_by_code,
            referral_code,
            type,
            product_type
        } = req.body;

        console.log("Signup Data:", req.body);

        if (!customer_name || !customer_email || !type || !referred_by_code) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing",
            });
        }

        /** 1️⃣ Check if customer already exists */
        let customer = await db.TargetCustomers.findOne({
            where: { customer_email },
            transaction,
        });

        console.log("Existing Customer:", customer);

        let parentCustomer = null;
        let finalBrokerId = null;
        let decoded_referred_by_code = null;

        if (type == "BROKER") {
            decoded_referred_by_code = Buffer.from(referred_by_code, "base64").toString("utf-8");
        } else {
            decoded_referred_by_code = referred_by_code;
        }

        /** 2️⃣ Resolve referral */
        if (type === "CUSTOMER") {
            const normalizedReferralCode = String(decoded_referred_by_code).trim();
            parentCustomer = await db.TargetCustomers.findOne({
                where: { referral_code: normalizedReferralCode },
                transaction,
            });

            console.log("Resolving CUSTOMER referral:", parentCustomer);
            console.log("Decoded Referred By Code:", parentCustomer.referral_code, referred_by_code);

            if (!parentCustomer) {
                console.log("Invalid customer referral code");

                return res.status(400).json({
                    success: false,
                    message: "Invalid customer referral code",
                });
            }

            if (parentCustomer.referral_code !== normalizedReferralCode) {
                console.log("Parent customer code mismatch");
                return res.status(400).json({
                    success: false,
                    message: "Referral code does not match parent customer's code",
                });
            }

            finalBrokerId = parentCustomer.broker_id;
        }

        else if (type === "BROKER") {
            console.log("Resolving BROKER referral");
            const broker = await db.Brokers.findOne({
                where: { referral_code: decoded_referred_by_code },
                transaction,
            });

            if (!broker) {
                console.log("Invalid broker referral code");
                return res.status(400).json({
                    success: false,
                    message: "Invalid broker referral code",
                });
            }

            finalBrokerId = broker.id;
            console.log("Referred by Broker ID:", finalBrokerId);
        }

        else {
            console.log("Invalid referral type:", type);
            return res.status(400).json({
                success: false,
                message: "Invalid referral type",
            });
        }

        /** 3️⃣ Update invited customer */
        if (customer) {
            console.log("Updating existing invited customer", customer.status);
            if (customer.status === "REGISTERED") {
                console.log("Customer already registered");
                return res.status(400).json({
                    success: false,
                    message: "Customer already registered",
                });
            }

            console.log("Proceeding to update customer record");

            await db.TargetCustomers.update(
                {
                    customer_name,
                    broker_id: finalBrokerId,
                    parent_customer_id: parentCustomer?.id || null,
                    referred_by_code: decoded_referred_by_code,
                    status: "REGISTERED",
                    referral_code: referral_code,
                    interest_in: product_type,
                },
                { where: { id: customer.id }, transaction }
            );
        }

        /** 4️⃣ New signup */
        else {
            customer = await db.TargetCustomers.create(
                {
                    customer_name,
                    customer_email,
                    broker_id: finalBrokerId,
                    interest_in: product_type,
                    parent_customer_id: parentCustomer?.id || null,
                    referred_by_code: decoded_referred_by_code,
                    referral_code: referral_code,
                    status: "REGISTERED",
                },
                { transaction }
            );
        }

        /** 5️⃣ Reward ONLY customer parent */
        if (parentCustomer && type === "CUSTOMER") {
            console.log("Rewarding parent customer ID:", parentCustomer.id);
            await db.TargetCustomers.increment(
                {
                    children_count: 1,
                },
                {
                    where: { id: parentCustomer.id },
                    transaction,
                }
            );
        }

        await transaction.commit();

        return res.json({
            success: true,
            message: "Customer registered successfully",
            data: customer,
        });
    } catch (error) {
        await transaction.rollback();
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Signup failed",
        });
    }
};

module.exports = customerSignupEasyGoldToken;