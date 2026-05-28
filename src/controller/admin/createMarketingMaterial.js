const db = require("../../models");
const fs = require("fs");
const path = require("path");

const createMarketingMaterial = async (req, res) => {
    try {
        const { title, german_title, type, category, youtube_url, german_youtube_url, width, height, description, german_description } = req.body;
        let asset_url = null;

        if (req.file) {
            asset_url = `uploads/marketing/${req.file.filename}`;
        }

        const material = await db.MarketingMaterial.create({
            title,
            german_title,
            type,
            category,
            asset_url,
            youtube_url,
            german_youtube_url,
            description,
            german_description,
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            is_active: true,
        });

        return res.status(201).json({
            success: true,
            message: "Marketing material created successfully",
            data: material,
        });
    } catch (error) {
        console.error("Error creating marketing material:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = createMarketingMaterial;