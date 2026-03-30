const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

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

const UpdateBrokerPaymentStatus = async (req, res) => {
  try {
    const { order_id, order_type, tree } = req.body;

    console.log(req.body);

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: "order_id is required",
      });
    }

    // Build where clause
    const whereClause = { order_id };

    // If order_type is provided, add it to where clause
    if (order_type) {
      whereClause.order_type = order_type;
    }

    // If tree is provided, add it to where clause
    if (tree) {
      whereClause.tree = tree;
    }

    let firstRecord = null;

    console.log(!order_type && !tree, "!order_type && !tree");

    // If neither order_type nor tree provided, get order_type from first record
    // if (!order_type && !tree) {
    firstRecord = await db.BrokerCommissionHistory.findOne({
      where: { order_id },
      attributes: ["order_type", "target_customer_log_id"],
      raw: true,
    });

    console.log(firstRecord, "this is calling");

    if (firstRecord && firstRecord.order_type) {
      whereClause.order_type = firstRecord.order_type;
    }
    // }

    // Update payment status to true for all brokers matching the where clause
    const [updatedCount] = await db.BrokerCommissionHistory.update(
      { is_payment_done: true },
      {
        where: whereClause,
      }
    );
    // const updatedCount = 1;
    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found for the given order",
      });
    }

    const targetCustomerData = await db.TargetCustomerReferralLogs.findOne({
      where: {
        id: firstRecord?.target_customer_log_id,
      },
      include: [
        {
          model: db.TargetCustomers,
          as: "fromCustomer",
          attributes: ["id", "customer_name", "customer_email"],
        }
      ],
      raw: true,
    });

    if (targetCustomerData) {
      let address = "";

      let mailConfig = {};
      let finalFrom = "";

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

      if (targetCustomerData?.product == "easygold Token") {
        host = MAIL_HOST;
        finalFrom = `"${EASY_GOLD_SUPPORT_MAIL_FROM_NAME}" <${EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS}>`;
        mailConfig = senderEmailConfig.easygold;
        address = "HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.easygold.io<br>support@easygold.io";
      } else if (targetCustomerData?.product == "Primeinvest") {
        host = MAIL_HOST;
        finalFrom = `"${PRIME_INVEST_SUPPORT_MAIL_FROM_NAME}" <${PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS}>`;
        mailConfig = senderEmailConfig?.primeinvest;
        address = "Hartmann & Benz Inc<br>8 The Green, Suite A<br>19901 Dover Kent County<br>United States of America (USA)<br>support@hbprimeinvest.com";
      } else if (targetCustomerData?.product == "goldflex") {
        host = GOLDFLEX_MAIL_HOST;
        finalFrom = `"${GOLD_FLEX_SUPPORT_MAIL_FROM_NAME}" <${GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS}>`;
        mailConfig = senderEmailConfig.goldflex;
        address = "Service in NGR – U.S. headquarters.<br><br>HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.goldflex.io<br>support@goldflex.io";
      }

      const templateVariables = {
        amount: targetCustomerData?.investment_amount || "",
        grams: `${targetCustomerData?.commission_amount} grams` || "",
        address: address
      };

      // const finalFrom = EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

      try {
        let emailData;
        emailData = await getRenderedEmail(108, "en", templateVariables);

        const mailOptions = {
          from: finalFrom,
          to: targetCustomerData['fromCustomer.customer_email'],
          subject: emailData.subject,
          html: emailData.htmlContent,
        };

        console.log(targetCustomerData, "targetCustomerData");

        console.log(mailOptions, "mailOptions");

        await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to, null, null, finalFrom, mailConfig, host);

      } catch (templateError) {
        console.error(templateError);
        throw new Error(
          "Email template (ID: 108) not found. Please ensure it exists in 6lwup_email_view table."
        );
      }
    }


    return res.status(200).json({
      success: true,
      message: "Payment status updated.",
      data: {
        order_id,
        order_type,
        is_payment_done: true,
        updated_records: updatedCount,
      },
    });
  } catch (error) {
    console.error("Error updating broker payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = UpdateBrokerPaymentStatus;
