const db = require("../../models");
const fs = require("fs");
const path = require("path");

const updateMarketingMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, german_title, category, youtube_url, german_youtube_url, width, height, is_active, description, german_description } = req.body;

        const material = await db.MarketingMaterial.findByPk(id);
        if (!material) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        let asset_url = material.asset_url;
        let german_asset_url = material.german_asset_url;
        if (req.files?.asset?.[0]) {

            if (material.asset_url) {
                const oldPath = path.join(
                    __dirname,
                    "../../../public",
                    material.asset_url
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            asset_url = `uploads/marketing/${req.files.asset[0].filename}`;
        }

        // German file
        if (req.files?.german_asset?.[0]) {

            if (material.german_asset_url) {
                const oldPath = path.join(
                    __dirname,
                    "../../../public",
                    material.german_asset_url
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            german_asset_url =
                `uploads/marketing/${req.files.german_asset[0].filename}`;
        } else if (req.body.clear_german_asset === "true") {
            if (material.german_asset_url) {
                const oldPath = path.join(
                    __dirname,
                    "../../../public",
                    material.german_asset_url
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            german_asset_url = null;
        }

        await material.update({
            title,
            german_title,
            category,
            youtube_url,
            german_youtube_url,
            width: width ? parseInt(width) : material.width,
            height: height ? parseInt(height) : material.height,
            is_active: is_active !== undefined ? is_active === 'true' || is_active === true : material.is_active,
            asset_url,
            german_asset_url,
            description: description !== undefined ? description : material.description,
            german_description: german_description !== undefined ? german_description : material.german_description,
        });

        return res.status(200).json({
            success: true,
            message: "Updated successfully",
            data: material,
        });
    } catch (error) {
        console.error("Error updating marketing material:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = updateMarketingMaterial;