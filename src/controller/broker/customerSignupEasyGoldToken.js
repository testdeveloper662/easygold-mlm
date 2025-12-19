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
        } = req.body;

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

        let parentCustomer = null;
        let finalBrokerId = null;

        /** 2️⃣ Resolve referral */
        if (type === "CUSTOMER") {
            parentCustomer = await db.TargetCustomers.findOne({
                where: { referral_code: referred_by_code },
                transaction,
            });

            if (!parentCustomer) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid customer referral code",
                });
            }

            finalBrokerId = parentCustomer.broker_id;
        }

        else if (type === "BROKER") {
            const broker = await db.Brokers.findOne({
                where: { referral_code: referred_by_code },
                transaction,
            });

            if (!broker) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid broker referral code",
                });
            }

            finalBrokerId = broker.id;
        }

        else {
            return res.status(400).json({
                success: false,
                message: "Invalid referral type",
            });
        }

        /** 3️⃣ Update invited customer */
        if (customer) {
            if (customer.status === "REGISTERED") {
                return res.status(400).json({
                    success: false,
                    message: "Customer already registered",
                });
            }

            await db.TargetCustomers.update(
                {
                    customer_name,
                    broker_id: finalBrokerId,
                    parent_customer_id: parentCustomer?.id || null,
                    referred_by_code,
                    status: "REGISTERED",
                },
                { transaction }
            );
        }

        /** 4️⃣ New signup */
        else {
            customer = await db.TargetCustomers.create(
                {
                    customer_name,
                    customer_email,
                    broker_id: finalBrokerId,
                    interest_in: "easygold Token",
                    parent_customer_id: parentCustomer?.id || null,
                    referred_by_code,
                    referral_code: referral_code,
                    status: "REGISTERED",
                },
                { transaction }
            );
        }

        /** 5️⃣ Reward ONLY customer parent */
        if (parentCustomer && type === "CUSTOMER") {
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