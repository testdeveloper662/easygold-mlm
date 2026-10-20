const db = require("../../models");
const jwt = require("jsonwebtoken");
const SendEmailHelper = require("../../utils/sendEmailHelper");
const { getRenderedEmail } = require("../../utils/emailTemplateHelper");

const RESET_PASSWORD_EMAIL_TEMPLATE_ID = 162;

const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await db.Users.findOne({
      where: {
        user_email: email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not exists",
      });
    }

    // Generate token valid for 15 minutes
    const token = jwt.sign(
      { email: user.user_email },
      process.env.JWT_ACCESS_TOKEN || "defaultsecret",
      { expiresIn: "15m" }
    );

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

    const languageMeta = await db.UsersMeta.findOne({
      where: { user_id: user.ID, meta_key: "language" },
      attributes: ["meta_value"],
    });
    const lang = String(languageMeta?.meta_value || "").toLowerCase().startsWith("de") ? "de" : "en";

    const { subject, htmlContent } = await getRenderedEmail(RESET_PASSWORD_EMAIL_TEMPLATE_ID, lang, {
      reset_link: `<a href="${resetLink}">${resetLink}</a>`,
    });

    await SendEmailHelper(subject, htmlContent, email);

    return res.status(200).json({
      success: true,
      message: "A password reset link has been sent to your email",
      data: {},
    });
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = ForgotPassword;
