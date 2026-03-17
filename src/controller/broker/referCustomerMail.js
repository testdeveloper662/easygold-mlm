const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const MAIL_SENDER = process.env.EASY_GOLD_CUSTOMER_SUPPORT_EMAIL;

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

    if (product == "easygold Token") {
      address = "HARTMANN & BENZ, LLC<br>a District of Columbia limited liability company<br>1717 N Street, NW STE 1<br>Washington, DC 20036<br>www.easygold.io<br>support@easygold.io";
    } else if (product == "Primeinvest") {
      address = "Hartmann & Benz Inc<br>8 The Green, Suite A<br>19901 Dover Kent County<br>United States of America (USA)<br>support@hbprimeinvest.com";
    } else if (product == "goldflex") {
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
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/gold_bonus_for_referrals_en.pdf`;
    } else {
      attachmentPath = `${process.env.NODE_URL}public/uploads/agreements/gold_bonus_for_referrals_de.pdf`;
    }

    mailOptions = {
      from: MAIL_SENDER,
      to: email,
      subject: emailData.subject,
      html: emailData.htmlContent,
    };

    console.log(attachmentPath, "attachmentPath");

    await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to, attachmentPath, null, MAIL_SENDER);

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
