const db = require("../../models");
const { sequelize } = require("../../config/database");
const SendEmailHelper = require("../../utils/sendEmailHelper");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const { registerCustomerUser } = require("../../utils/registerCustomerUserHelper");
const ReferralLogs = db.TargetCustomerReferralLogs;

const MAIL_SENDER = process.env.MAIL_SENDER;
const EASY_GOLD_CUSTOMER_SUPPORT_EMAIL = process.env.EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

const MAIL_HOST = process.env.MAIL_HOST;
const GOLDFLEX_MAIL_HOST = process.env.GOLDFLEX_MAIL_HOST;

const GOLD_FLEX_SUPPORT_MAIL_SENDER = process.env.GOLD_FLEX_SUPPORT_MAIL_SENDER;
const GOLD_FLEX_SUPPORT_MAIL_PASSWORD = process.env.GOLD_FLEX_SUPPORT_MAIL_PASSWORD;
const GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS = process.env.GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS;
const GOLD_FLEX_SUPPORT_MAIL_FROM_NAME = process.env.GOLD_FLEX_SUPPORT_MAIL_FROM_NAME;

const PRIME_INVEST_SUPPORT_MAIL_SENDER = process.env.PRIME_INVEST_SUPPORT_MAIL_SENDER;
const PRIME_INVEST_SUPPORT_MAIL_PASSWORD = process.env.PRIME_INVEST_SUPPORT_MAIL_PASSWORD;
const PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS = process.env.PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS;
const PRIME_INVEST_SUPPORT_MAIL_FROM_NAME = process.env.PRIME_INVEST_SUPPORT_MAIL_FROM_NAME;

const EASY_GOLD_SUPPORT_MAIL_SENDER = process.env.EASY_GOLD_SUPPORT_MAIL_SENDER;
const EASY_GOLD_SUPPORT_MAIL_PASSWORD = process.env.EASY_GOLD_SUPPORT_MAIL_PASSWORD;
const EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS = process.env.EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS;
const EASY_GOLD_SUPPORT_MAIL_FROM_NAME = process.env.EASY_GOLD_SUPPORT_MAIL_FROM_NAME;

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

        console.log("======================================");
        console.log("Signup request received with data from other platform - referral:", req.body);
        console.log("======================================");

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
        let decoded_referred_by_code = null;

        let parentBroker = null;
        if (type == "BROKER") {
            try {
                const decoded = Buffer.from(referred_by_code, "base64").toString("utf-8");
                if (decoded && /^[A-Za-z0-9_-]+$/.test(decoded)) {
                    decoded_referred_by_code = decoded;
                } else {
                    decoded_referred_by_code = referred_by_code;
                }
            } catch (e) {
                decoded_referred_by_code = referred_by_code;
            }
        } else {
            decoded_referred_by_code = referred_by_code;
        }

        const normalizedCode = String(decoded_referred_by_code).trim();
        console.log("Centralized referral search for code:", normalizedCode);

        // 2️⃣ Centralized Referral System Lookup
        // Check UserReferrals -> Brokers -> Affiliates -> TargetCustomers -> Admin Referral Code
        let userRef = await db.UserReferrals.findOne({
            where: { referral_code: normalizedCode },
            transaction,
        });

        if (userRef) {
            parentBroker = await db.Brokers.findOne({
                where: { user_id: userRef.user_id },
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["user_email", "display_name"]
                    }
                ],
                transaction,
            });

            if (!parentBroker) {
                const createdBroker = await db.Brokers.create(
                    {
                        user_id: userRef.user_id,
                        referral_code: userRef.referral_code,
                        referred_by_code: userRef.referred_by_code,
                        children_count: 0,
                    },
                    { transaction }
                );
                parentBroker = await db.Brokers.findOne({
                    where: { id: createdBroker.id },
                    include: [
                        {
                            model: db.Users,
                            as: "user",
                            attributes: ["user_email", "display_name"]
                        }
                    ],
                    transaction,
                });
            }
            finalBrokerId = parentBroker?.id || null;
        }

        if (!parentBroker) {
            parentBroker = await db.Brokers.findOne({
                where: { referral_code: normalizedCode },
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["user_email", "display_name"]
                    }
                ],
                transaction,
            });
            if (parentBroker) {
                finalBrokerId = parentBroker.id;
            }
        }

        if (!parentBroker && db.Affiliates) {
            const affiliate = await db.Affiliates.findOne({
                where: { referral_code: normalizedCode },
                transaction,
            });
            if (affiliate) {
                parentBroker = await db.Brokers.findOne({
                    where: { user_id: affiliate.user_id },
                    include: [
                        {
                            model: db.Users,
                            as: "user",
                            attributes: ["user_email", "display_name"]
                        }
                    ],
                    transaction,
                });
                if (!parentBroker) {
                    const createdBroker = await db.Brokers.create(
                        {
                            user_id: affiliate.user_id,
                            referral_code: affiliate.referral_code,
                            referred_by_code: affiliate.referred_by_code,
                            children_count: 0,
                        },
                        { transaction }
                    );
                    parentBroker = await db.Brokers.findOne({
                        where: { id: createdBroker.id },
                        include: [
                            {
                                model: db.Users,
                                as: "user",
                                attributes: ["user_email", "display_name"]
                            }
                        ],
                        transaction,
                    });
                }
                finalBrokerId = parentBroker?.id || null;
            }
        }

        if (!parentBroker && !parentCustomer) {
            parentCustomer = await db.TargetCustomers.findOne({
                where: { referral_code: normalizedCode },
                raw: true,
                transaction,
            });
            if (parentCustomer) {
                finalBrokerId = parentCustomer.broker_id;
            }
        }

        const adminCode = (process.env.ADMIN_REFERRAL_CODE || "ADMIN").trim().toUpperCase();
        if (!parentBroker && !parentCustomer && (normalizedCode.toUpperCase() === adminCode || normalizedCode.toUpperCase() === "ESYGOLD916")) {
            parentBroker = await db.Brokers.findOne({
                include: [
                    {
                        model: db.Users,
                        as: "user",
                        attributes: ["user_email", "display_name"]
                    }
                ],
                transaction,
            });
            finalBrokerId = parentBroker?.id || null;
        }

        if (!parentBroker && !parentCustomer) {
            console.log("Invalid referral code across centralized system:", normalizedCode);
            return res.status(400).json({
                success: false,
                message: "Invalid broker referral code",
            });
        }

        // Auto-generate referral_code if not passed from external system
        const generateCode = () => "ref" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const activeReferralCode = referral_code || generateCode();

        /** 3️⃣ Update existing customer */
        if (customer) {
            console.log("Existing customer found for signup:", customer.customer_email);

            if (type === "BROKER" && parentBroker?.user?.user_email) {
                try {
                    let address = "";
                    let mailConfig = {};
                    let finalFrom;

                    const senderEmailConfig = {
                        easygold: {
                            user: EASY_GOLD_SUPPORT_MAIL_SENDER,
                            pass: EASY_GOLD_SUPPORT_MAIL_PASSWORD,
                        },
                        goldflex: {
                            user: GOLD_FLEX_SUPPORT_MAIL_SENDER,
                            pass: GOLD_FLEX_SUPPORT_MAIL_PASSWORD,
                        },
                        primeinvest: {
                            user: PRIME_INVEST_SUPPORT_MAIL_SENDER,
                            pass: PRIME_INVEST_SUPPORT_MAIL_PASSWORD,
                        }
                    };

                    let host = MAIL_HOST;

                    if (product_type == "easygold Token") {
                        host = MAIL_HOST;
                        finalFrom = `"${EASY_GOLD_SUPPORT_MAIL_FROM_NAME}" <${EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS}>`;
                        mailConfig = senderEmailConfig.easygold;
                        address = "HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.easygold.io<br>support@easygold.io";
                    } else if (product_type == "Primeinvest") {
                        host = MAIL_HOST;
                        finalFrom = `"${PRIME_INVEST_SUPPORT_MAIL_FROM_NAME}" <${PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS}>`;
                        mailConfig = senderEmailConfig.primeinvest;
                        address = "Hartmann & Benz Inc<br>8 The Green, Suite A<br>19901 Dover Kent County<br>United States of America (USA)<br>support@hbprimeinvest.com";
                    } else if (product_type == "goldflex") {
                        host = GOLDFLEX_MAIL_HOST;
                        finalFrom = `"${GOLD_FLEX_SUPPORT_MAIL_FROM_NAME}" <${GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS}>`;
                        mailConfig = senderEmailConfig.goldflex;
                        address = "Service in NGR – U.S. headquarters.<br><br>HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.goldflex.io<br>support@goldflex.io";
                    }

                    const templateVariables = {
                        customer_name: customer_name || customer.customer_name,
                        b2b_partner: "",
                        sending_link: "",
                        b2b_info: "",
                        address: address,
                    };

                    const customerEmailData = await getRenderedEmail(107, "en", templateVariables);

                    const customerMailOptions = {
                        from: finalFrom,
                        to: parentBroker?.user?.user_email,
                        subject: customerEmailData.subject,
                        html: customerEmailData.htmlContent,
                    };

                    await SendEmailHelper(customerMailOptions.subject, customerMailOptions.html, customerMailOptions.to, null, null, finalFrom, mailConfig, host);
                } catch (mailError) {
                    console.error("Error sending broker email:", mailError);
                }
            }

            const newReferralCode = referral_code || customer.referral_code || activeReferralCode;
            const newReferredByCode = decoded_referred_by_code || customer.referred_by_code || null;

            await customer.update(
                {
                    customer_name: customer_name || customer.customer_name,
                    broker_id: finalBrokerId || customer.broker_id,
                    parent_customer_id: parentCustomer?.id || customer.parent_customer_id,
                    referred_by_code: newReferredByCode,
                    status: "REGISTERED",
                    referral_code: newReferralCode,
                    interest_in: product_type || customer.interest_in,
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
                    interest_in: product_type,
                    parent_customer_id: parentCustomer?.id || null,
                    referred_by_code: decoded_referred_by_code,
                    referral_code: activeReferralCode,
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

            await ReferralLogs.create(
                {
                    broker_id: finalBrokerId,
                    from_customer_id: parentCustomer.id,
                    to_customer_id: customer.id,
                    type: "REFERRAL_CREATED",
                    status: "APPROVED",
                    product: product_type
                },
                { transaction }
            );
        }

        /** 6️⃣ Ensure customer entry in 6LWUP_users & user_referrals */
        if (customer) {
            await registerCustomerUser(customer, transaction);
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