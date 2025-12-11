require("dotenv").config();
const db = require("../../models");

const GetUserUrls = async (req, res) => {
    try {
        const { user } = req.user;

        // Get user details
        const userDetails = await db.Users.findOne({
            where: { ID: user.ID },
        });

        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        let data = {
            primeinvesturl: `https://dashboard.hb-primeinvest.com/en/sign-up`,
            easygoldurl: `https://easygold.io/en/sign-up`,
            landing_page: user?.landing_page,
            landing_pageurl: `${process.env.EASY_GOLD_URL}/landingpage/${user?.mystorekey}`
        };

        return res.status(200).json({
            success: true,
            message: "User urls retrieved successfully",
            data,
        });
    } catch (error) {
        console.error("Error fetching user urls:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = GetUserUrls;
