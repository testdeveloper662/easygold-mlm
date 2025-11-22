const db = require("../../models");
const nodemailer = require("nodemailer");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

const ReferBroker = async (req, res) => {
  try {
    const { email, lang } = req.body;
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

    const userExist = await db.Users.findOne({
      where: { user_email: email },
    });
    console.log(email, "email");
    console.log(userExist, "userExist");
    if(userExist) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists. They cannot be referred again.",
      });
    }

    const parentBroker = await db.Brokers.findOne({
      where: { user_id: user.ID },
    });

    if (!parentBroker) {
      return res.status(400).json({
        success: false,
        message: "Parent broker record not found.",
      });
    }

    // Check if parent broker already has 4 children
    const childrenCount = await db.Brokers.count({
      where: { parent_id: parentBroker.id },
    });

    if (childrenCount >= 4) {
      return res.status(400).json({
        success: false,
        message: "You have already referred the maximum of 4 brokers.",
      });
    }

    // Setup transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: MAIL_SENDER,
        pass: MAIL_PASSWORD,
      },
    });

    let mailOptions;

    // ✅ CASE 1: User already exists → return error
    if (userExist) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists. They cannot be referred again.",
      });
    }

    // ✅ CASE 2: User does NOT exist → send registration email
    else {
      // Create registration URL with base64 encoded referral code
      const encodedReferralCode = Buffer.from(parentBroker.referral_code || "").toString("base64");
      const registrationUrl = `${FRONTEND_URL}/broker-register/step1/${encodedReferralCode}`;

      // Create clickable link text based on language
      const linkText = language === "de" || language === "de-DE" ? "Jetzt mit Empfehlungscode registrieren" : "Register now with referral code";

      // Template variables to replace placeholders
      const templateVariables = {
        email: email,
        referral_code: parentBroker.referral_code || "",
        referal_code_link: `<a href="${registrationUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">${linkText}</a>`,
        brokerName: email.split("@")[0],
      };

      // Fetch and render email template from database
      let emailData;
      try {
        emailData = await getRenderedEmail(84, language, templateVariables);
      } catch (templateError) {
        throw new Error(
          "Email template not found in database. Please ensure template with id 84 exists in 6lwup_email_view table."
        );
      }

      mailOptions = {
        from: MAIL_SENDER,
        to: email,
        subject: emailData.subject,
        html: emailData.htmlContent,
      };
    }

    await transporter.sendMail(mailOptions);

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

module.exports = ReferBroker;
