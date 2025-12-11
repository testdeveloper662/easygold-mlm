const db = require("../../models");
const path = require("path");
const fs = require("fs");

const DeleteAffiliateBanner = async (req, res) => {
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

        const affiliateBanner = await db.AffiliateBanners.findOne({
            where: {
                id: id,
                broker_id: broker.id,
            },
        });

        if (!affiliateBanner) {
            return res.status(404).json({
                success: false,
                message: "Affiliate banner not found",
            });
        }

        if (affiliateBanner.backgroundImage) {
            const filePath = path.join(
                "public",
                affiliateBanner.backgroundImage.replace("/uploads/", "")
            );

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await affiliateBanner.destroy();

        return res.status(200).json({
            success: true,
            message: "Affiliate banner deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting affiliate banner:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = DeleteAffiliateBanner;

