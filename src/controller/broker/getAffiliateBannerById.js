require("dotenv").config();
const db = require("../../models");

const GetAffiliateBannerById = async (req, res) => {
    try {
        const { user } = req.user;
        const { id } = req.params;

        // Get broker details
        const broker = await db.Brokers.findOne({
            where: { user_id: user.ID },
        });

        if (!broker) {
            return res.status(404).json({
                success: false,
                message: "Broker not found",
            });
        }

        // Get target customer
        const affiliateBanner = await db.AffiliateBanners.findOne({
            where: {
                id: id,
                broker_id: broker.id, // Ensure broker can only access their own banner
            },
        });

        if (!affiliateBanner) {
            return res.status(404).json({
                success: false,
                message: "Affiliate Banner not found",
            });
        }

        const formattedData = affiliateBanner.toJSON();

        // ✅ Parse stored JSON strings
        formattedData.qrPosition = formattedData.qrPosition
            ? JSON.parse(formattedData.qrPosition)
            : null;

        formattedData.qrSize = formattedData.qrSize
            ? JSON.parse(formattedData.qrSize)
            : null;

        formattedData.backgroundImage = formattedData.backgroundImage ? `${process.env.NODE_URL}uploads${formattedData.backgroundImage}` : null;

        return res.status(200).json({
            success: true,
            message: "Affiliate Banner retrieved successfully",
            data: formattedData,
        });
    } catch (error) {
        console.error("Error fetching affiliate banner:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = GetAffiliateBannerById;

