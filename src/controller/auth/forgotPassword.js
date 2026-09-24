const db = require("../../models");
const jwt = require("jsonwebtoken");
const SendEmailHelper = require("../../utils/sendEmailHelper");

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

    // Send email with reset link
    const subject = "Password Reset Request";
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Dear User,</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetLink}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link is valid for 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;

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
