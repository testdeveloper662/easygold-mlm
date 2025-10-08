const db = require("../../models");
const bcrypt = require("bcrypt");

const ResetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const user = await db.Users.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not exists",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await user.update({
      password: hashedPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
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

module.exports = ResetPassword;
