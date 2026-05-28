const db = require("../../models");

const GetBrokerLinkDetails = async (req, res) => {
    try {
        const { mystorekey } = req.query;

        const user = await db.Users.findOne({
            where: { mystorekey: mystorekey },
            attributes: ["display_name", "landing_page", "mystorekey", "user_email", "ID"]
        });

        const broker = await db.Brokers.findOne({
            where: { user_id: user.ID },
            attributes: ["id", "referral_code"],
        });

        let brokerReferralCode = Buffer.from(String(broker?.referral_code), "utf-8").toString("base64")

        return res.status(200).json({
            success: true,
            landing_page_url: `${process.env.PUBLIC_URL}landingpage/${user.mystorekey}`,
            registration_page_url: `${process.env.FRONTEND_URL}/broker-register/step1/${brokerReferralCode}`,
        });
    } catch (error) {
        console.error("Error fetching marketing materials for broker:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = GetBrokerLinkDetails;
