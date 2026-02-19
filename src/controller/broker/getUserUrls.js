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

        const brokerDetails = await db.Brokers.findOne({
            where: {
                user_id: user.ID,
            },
        });

        if (!brokerDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        let easyGoldReferralCode = Buffer.from(String(brokerDetails?.referral_code), "utf-8").toString("base64")

        let data = {
            goldflexurl: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/goldflex`,
            primeinvesturl: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/primeinvest`,
            easygoldurl: `${process.env.FRONTEND_URL}/customer-referral/${easyGoldReferralCode}/easygold`,
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
