const db = require("../../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;

const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(404).json({
        success: false,
        message: "Password is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const user = await db.Users.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not exists",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    const { password: _, ...userData } = user.toJSON();

    const token = jwt.sign(
      {
        user: userData,
      },
      JWT_ACCESS_TOKEN,
      {
        expiresIn: process.env.JWT_EXPIRE || "90d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        user: userData,
        token,
      },
    });
  } catch (error) {
    console.log("Error: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = Login;
