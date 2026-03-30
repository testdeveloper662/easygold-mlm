const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const MAIL_SENDER = process.env.EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

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

const ReferCustomerMail = async (req, res) => {
  try {
    const { email, lang, product } = req.body;
    const { user } = req.user;

    let language = "en"; // Default to English

    if (lang) {
      const langStr = String(lang).toLowerCase().trim();
      if (langStr === "de-DE" || langStr === "de" || langStr === "german" || langStr === "deutsch") {
        language = "de-DE";
      }
    }
    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access. Only brokers can register new brokers.",
      });
    }

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

    if (product == "easygold Token") {
      host = MAIL_HOST;
      finalFrom = `"${EASY_GOLD_SUPPORT_MAIL_FROM_NAME}" <${EASY_GOLD_SUPPORT_MAIL_FROM_ADDRESS}>`;
      mailConfig = senderEmailConfig.easygold;

      address = "HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.easygold.io<br>support@easygold.io";
    } else if (product == "Primeinvest") {
      host = MAIL_HOST;
      finalFrom = `"${PRIME_INVEST_SUPPORT_MAIL_FROM_NAME}" <${PRIME_INVEST_SUPPORT_MAIL_FROM_ADDRESS}>`;
      mailConfig = senderEmailConfig.primeinvest;

      address = "Hartmann & Benz Inc<br>8 The Green, Suite A<br>19901 Dover Kent County<br>United States of America (USA)<br>support@hbprimeinvest.com";
    } else if (product == "goldflex") {
      host = GOLDFLEX_MAIL_HOST;
      finalFrom = `"${GOLD_FLEX_SUPPORT_MAIL_FROM_NAME}" <${GOLD_FLEX_SUPPORT_MAIL_FROM_ADDRESS}>`;
      mailConfig = senderEmailConfig.goldflex;

      address = "Service in NGR – U.S. headquarters.<br><br>HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.goldflex.io<br>support@goldflex.io";
    }

    let mailOptions;

    // Template variables to replace placeholders
    const templateVariables = {
      address: address,
    };

    // Fetch and render email template from database
    let emailData;
    try {
      emailData = await getRenderedEmail(106, language, templateVariables);
    } catch (templateError) {
      throw new Error(
        "Email template not found in database. Please ensure template with id 84 exists in 6lwup_email_view table."
      );
    }

    let attachmentPath = null;
    if (language == "en") {
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/customer_referral_program_en.pdf`;
    } else {
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/customer_referral_program_de.pdf`;
    }

    mailOptions = {
      from: mailConfig.user,
      to: email,
      subject: emailData.subject,
      html: emailData.htmlContent,
    };

    console.log(attachmentPath, "attachmentPath");

    await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to, attachmentPath, null, finalFrom, mailConfig, host);

    return res.status(200).json({
      success: true,
      message: `Email sent successfully to ${email}`,
    });
  } catch (error) {
    console.error("Error in ReferBroker:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = ReferCustomerMail;
