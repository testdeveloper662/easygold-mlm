require("dotenv").config();
const db = require("../../models");
const { Op } = require("sequelize");

const GetAffiliateBanner = async (req, res) => {
    try {
        const { user } = req.user;

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

        // Get pagination and filter parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";

        // Build where clause
        const whereClause = {
            broker_id: broker.id,
        };

        // Add search filter
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { url: { [Op.like]: `%${search}%` } },
            ];
        }

        // Get total count
        const totalCount = await db.AffiliateBanners.count({
            where: whereClause,
        });

        // Get paginated affiliate banners
        const affiliateBanners = await db.AffiliateBanners.findAll({
            where: whereClause,
            order: [["createdAt", "DESC"]],
            limit: limit,
            offset: offset,
        });

        const bannersWithFullImage = affiliateBanners.map((item) => ({
            ...item.dataValues,
            qrPosition: item.qrPosition ? JSON.parse(item.qrPosition) : null,
            qrSize: item.qrSize ? JSON.parse(item.qrSize) : null,
            backgroundImage: item.backgroundImage
                ? `${process.env.NODE_URL}uploads${item.backgroundImage}`
                : null,
        }));

        return res.status(200).json({
            success: true,
            message: "Affiliate Banners retrieved successfully",
            data: {
                banners: bannersWithFullImage,
                total: totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                limit: limit,
            },
        });
    } catch (error) {
        console.error("Error fetching affiliate banners:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = GetAffiliateBanner;
