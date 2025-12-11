require("dotenv").config();
const db = require("../../models");
const { uploadProfilePicture } = require("../../utils/Helper");

const CreateAffiliateBanner = async (req, res) => {
    try {
        const { user } = req.user;

        // Get broker details
        const broker = await db.Brokers.findOne({
            where: { user_id: user.ID },
            include: [
                {
                    model: db.Users,
                    as: "user",
                    attributes: ["landing_page", "mystorekey", "user_email"]
                }
            ]
        });

        if (!broker) {
            return res.status(404).json({
                success: false,
                message: "Broker not found",
            });
        }

        let backgroundImagePath = null;
        if (req.file) {
            console.log(req.file, "req.file");
            // backgroundImagePath = await uploadProfilePicture(
            //     req.file,
            //     "public/uploads/banners",
            //     "banners"
            // );
            backgroundImagePath = await uploadProfilePicture(
                req.file,
                "banners",  // folder inside uploads
                "banners"
            );
        }

        const { name, product_selected, url, qrPosition, qrSize } = req.body;

        // Validate required fields
        if (!product_selected || !url) {
            return res.status(400).json({
                success: false,
                message: "Product selected name and url are required",
            });
        }

        if (broker.user?.landing_page == 0 && product_selected == "Landingpage") {
            return res.status(400).json({
                success: false,
                message: "Your landing page not activate yet, Please activate first on B2B dashboard.",
            });
        }

        // Create affiliate banner
        const affiliateBanner = await db.AffiliateBanners.create({
            broker_id: broker.id,
            name,
            product_selected,
            url,
            qrPosition,
            qrSize,
            backgroundImage: backgroundImagePath,
        });

        return res.status(201).json({
            success: true,
            message: "Affiliate banner created successfully",
            data: affiliateBanner,
        });
    } catch (error) {
        console.error("Error creating target customer:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = CreateAffiliateBanner;
