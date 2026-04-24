const db = require("../../models");
const { sequelize } = require("../../config/database");
const SendEmailHelper = require("../../utils/sendEmailHelper");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
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
            where: { customer_email, interest_in: product_type },
            transaction,
        });

        let parentCustomer = null;
        let finalBrokerId = null;
        let decoded_referred_by_code = null;

        let parentBroker = null;

        if (type == "BROKER") {
            decoded_referred_by_code = Buffer.from(referred_by_code, "base64").toString("utf-8");
        } else {
            decoded_referred_by_code = referred_by_code;
        }

        /** 2️⃣ Resolve referral */
        if (type === "CUSTOMER") {
            const normalizedReferralCode = String(decoded_referred_by_code).trim();
            console.log(`---------${normalizedReferralCode}------`, "normalizedReferralCode");

            parentCustomer = await db.TargetCustomers.findOne({
                where: { referral_code: normalizedReferralCode, interest_in: product_type },
                raw: true,
                transaction,
            });

            console.log(parentCustomer, "parentCustomer");

            if (!parentCustomer) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid customer referral code",
                });
            }

            console.log("Parent customer found:", parentCustomer.referral_code !== normalizedReferralCode);

            if (parentCustomer.referral_code !== normalizedReferralCode) {
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
                include: [
                    {
                        model: db.Users, // 👈 your user model
                        as: "user",      // 👈 must match association
                        attributes: ["user_email", "display_name"]
                    }
                ],
                transaction,
            });

            if (!broker) {
                console.log("Invalid broker referral code");
                return res.status(400).json({
                    success: false,
                    message: "Invalid broker referral code",
                });
            }

            parentBroker = broker;

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
                console.log("Customer already registered");

                console.log("Checking if we need to send email to broker for existing customer registration");
                console.log("Type:", type);
                console.log("parentBroker?.email:", parentBroker?.user?.user_email);
                console.log("parentBroker:", parentBroker);

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
                            customer_name: customer_name,
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
                        // don't fail API if email fails
                    }
                }

                if (product_type === customer.interest_in && (product_type === "easygold Token" || product_type === "Primeinvest" || product_type === "goldflex")) {
                    customer = await customer.update(
                        {
                            referral_code: referral_code,
                            interest_in: product_type,
                        },
                        { transaction }
                    );
                } else {

                    return res.status(400).json({
                        success: false,
                        message: "Customer already registered",
                    });
                }
            }

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