const db = require("../../models");
const { Op } = require("sequelize");

const GetInvitations = async (req, res) => {
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

        // Pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";

        // Build filter
        const whereClause = {
            invited_by: broker.id,
        };

        // Search by email only
        if (search) {
            whereClause.email = { [Op.like]: `%${search}%` };
        }

        // Get total count
        const totalCount = await db.BrokerInvitations.count({
            where: whereClause,
        });

        // Get paginated list
        const invitations = await db.BrokerInvitations.findAll({
            where: whereClause,
            order: [["created_at", "DESC"]],
            limit,
            offset,
        });

        return res.status(200).json({
            success: true,
            message: "Invitations retrieved successfully",
            data: {
                invitations,
                total: totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit),
                limit,
            },
        });
    } catch (error) {
        console.error("Error fetching invitations:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = GetInvitations;
