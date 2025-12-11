const db = require("../../models");
const fs = require("fs");
const path = require("path");
const { uploadProfilePicture } = require("../../utils/Helper");
const { Op } = require("sequelize");

const UpdateAffiliateBanner = async (req, res) => {
    try {
        const { user } = req.user;
        const { id } = req.params;

        // Find broker
        const broker = await db.Brokers.findOne({
            where: { user_id: user.ID },
        });

        if (!broker) {
            return res.status(404).json({
                success: false,
                message: "Broker not found",
            });
        }

        // Get banner
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

        const { name, url, product_selected, qrPosition, qrSize } = req.body;

        // 🚫 Duplicate check when both changed
        // if (product_selected && url &&
        //     (product_selected !== affiliateBanner.product_selected || url !== affiliateBanner.url)) {
        //     const existing = await db.AffiliateBanners.findOne({
        //         where: {
        //             broker_id: broker.id,
        //             product_selected,
        //             url,
        //             id: { [Op.ne]: id },
        //         },
        //     });

        //     if (existing) {
        //         return res.status(400).json({
        //             success: false,
        //             message: "Banner with this product and URL already exists",
        //         });
        //     }
        // }

        // 📌 Image handling
        let backgroundImagePath = affiliateBanner.backgroundImage; // default (keep old)

        if (req.file) {
            // Upload new file (fixed path!)
            const newPath = await uploadProfilePicture(
                req.file,
                "banners",     // folder inside /public/uploads/
                "banners",
                affiliateBanner.backgroundImage // old file (auto delete in helper)
            );

            if (newPath) {
                backgroundImagePath = newPath;
            }
        }

        // Update banner
        await affiliateBanner.update({
            name: name ?? affiliateBanner.name,
            product_selected: product_selected ?? affiliateBanner.product_selected,
            url: url ?? affiliateBanner.url,
            qrPosition: qrPosition ?? affiliateBanner.qrPosition,
            qrSize: qrSize ?? affiliateBanner.qrSize,
            backgroundImage: backgroundImagePath,
        });

        return res.status(200).json({
            success: true,
            message: "Affiliate banner updated successfully",
            data: affiliateBanner,
        });

    } catch (error) {
        console.error("Error updating affiliate banner:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = UpdateAffiliateBanner;
