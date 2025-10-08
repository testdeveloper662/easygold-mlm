const db = require("../../models");

const ValidateOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
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

    // Validate OTP
    if (user.otp.toString() !== otp.toString()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.otp_expires || new Date() > new Date(user.otp_expires)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    await user.update({
      otp: null,
      otp_expires: null,
    });

    return res.status(200).json({
      success: true,
      message: "Correct OTP",
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

module.exports = ValidateOTP;
