const db = require("../../models");

const CheckExist = async (req, res) => {
    try {
        const { email, company, username } = req.body;

        const existingUserByEmail = await db.Users.findOne({
            where: { user_email: email },
        });

        if (existingUserByEmail) {
            return res.status(200).json({
                success: false,
                field: "email",
                message: "A user with this email already exists. Please use a different email address.",
            });
        }

        // // Check if username already exists
        const existingUserByUsername = await db.Users.findOne({
            where: { user_login: username },
        });

        if (existingUserByUsername) {
            return res.status(200).json({
                success: false,
                field: "username",
                message: "This username is already taken. Please choose a different username.",
            });
        }

        // // Check if mystorekey already exists
        const existingUserByMyStore = await db.Users.findOne({
            where: { mystorekey: company },
        });

        if (existingUserByMyStore) {
            return res.status(200).json({
                success: false,
                field: "company",
                message: "This company name is already taken. Please choose a different company name.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Broker Not exists",
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = CheckExist;
