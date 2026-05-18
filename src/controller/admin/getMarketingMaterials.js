const db = require("../../models");
const fs = require("fs");
const path = require("path");

const getMarketingMaterials = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;

        const { count, rows: materials } = await db.MarketingMaterial.findAndCountAll({
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        const materialsWithFullUrl = materials.map((m) => ({
            ...m.toJSON(),
            asset_url: m.asset_url ? `${process.env.NODE_URL}${m.asset_url}` : null,
        }));

        return res.status(200).json({
            success: true,
            data: materialsWithFullUrl,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            currentPage: page,
        });
    } catch (error) {
        console.error("Error fetching marketing materials:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = getMarketingMaterials;