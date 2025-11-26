const db = require("../../models");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");
const SendEmailHelper = require("../../utils/sendEmailHelper");

const MAIL_SENDER = process.env.MAIL_SENDER;
const MAIL_PASSWORD = process.env.MAIL_PASSWORD;
const ADMIN_REFERRAL_CODE = process.env.ADMIN_REFERRAL_CODE;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// Validate required environment variables
if (!MAIL_SENDER || !MAIL_PASSWORD) {
  console.warn("Warning: MAIL_SENDER or MAIL_PASSWORD not set in environment variables");
}
if (!ADMIN_REFERRAL_CODE) {
  console.warn("Warning: ADMIN_REFERRAL_CODE not set in environment variables");
}

const RegisterBroker = async (req, res) => {
  try {
    const { brokerName, email, lang } = req.body;

    let language = "en"; // Default to English

    // Check req.body.lang first
    if (lang !== undefined && lang !== null) {
      const langStr = String(lang).toLowerCase().trim();
      if (langStr === "de-DE" || langStr === "de" || langStr === "german" || langStr === "deutsch") {
        language = "de";
      } else if (langStr === "en" || langStr === "english") {
        language = "en";
      }
    } else {
      // Try to get language from authenticated admin user's preferences
      if (req.user && req.user.user && req.user.user.ID) {
        try {
          const userLanguageMeta = await db.UsersMeta.findOne({
            where: {
              user_id: req.user.user.ID,
              meta_key: "language",
            },
          });

          if (userLanguageMeta && userLanguageMeta.meta_value) {
            const userLang = String(userLanguageMeta.meta_value).toLowerCase().trim();
            if (langStr === "de-DE" || userLang === "german" || userLang === "de" || userLang === "deutsch") {
              language = "de";
            }
          }
        } catch (metaError) {
          // Silent fail - use default language
        }
      }
    }

    // Check if broker already exists
    const existingUser = await db.Users.findOne({ where: { user_email: email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // Validate email configuration
    if (!MAIL_SENDER || !MAIL_PASSWORD) {
      return res.status(500).json({
        success: false,
        message: "Email configuration is missing. Please contact administrator.",
      });
    }

    // Create register URL with base64 encoded referral code (Node.js uses Buffer, not btoa)
    const encodedReferralCode = Buffer.from(ADMIN_REFERRAL_CODE || "ADMIN").toString("base64");
    const registerUrl = `${process.env.FRONTEND_URL || FRONTEND_URL}/broker-register/step1/${encodedReferralCode}`;

    // Create clickable link text based on language
    const linkText = language === "de-DE" || language === "de" ? "Jetzt mit Empfehlungscode registrieren" : "Register now with referral code";

    // Template variables to replace placeholders
    // Variable names must match EXACTLY the placeholders in database template: [email], [referral_code], [referal_code_link], [brokerName], [tempPassword]
    const templateVariables = {
      email: email, // Replaces [email]
      referral_code: ADMIN_REFERRAL_CODE || "ADMIN", // Replaces [referral_code]
      referal_code_link: `<a href="${registerUrl}" style="color: #0066cc; text-decoration: none; font-weight: bold;">${linkText}</a>`, // Replaces [referal_code_link] - now a complete HTML anchor tag
      brokerName: brokerName || email.split("@")[0], // Replaces [brokerName] - fallback to email username if not provided
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

    const mailOptions = {
      from: MAIL_SENDER,
      to: email,
      subject: emailData.subject,
      html: emailData.htmlContent,
    };

    await SendEmailHelper(mailOptions.subject, mailOptions.html, mailOptions.to);
    // Send email
    // await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Email has been sent with Registration details.",
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

module.exports = RegisterBroker;
