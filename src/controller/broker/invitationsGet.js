const db = require("../../models");
const { Op } = require("sequelize");

const GetInvitations = async (req, res) => {
    try {
        const userObj = req.user?.user || req.user || {};

        const targetUserId = (userObj.role === "SUPER_ADMIN" && req.query.viewUserId)
            ? parseInt(req.query.viewUserId)
            : (userObj.ID || userObj.id);

        let broker = null;
        if (targetUserId) {
            broker = await db.Brokers.findOne({
                where: { user_id: targetUserId },
            });
            if (!broker && db.Affiliates) {
                broker = await db.Affiliates.findOne({
                    where: { user_id: targetUserId },
                });
            }
        }

        // Pagination params
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || "";

        // Build filter: match any possible referrer ID variant
        const invitedByIds = [];
        if (targetUserId) invitedByIds.push(targetUserId);
        if (userObj.ID) invitedByIds.push(userObj.ID);
        if (userObj.broker_id) invitedByIds.push(userObj.broker_id);
        if (broker && broker.id) invitedByIds.push(broker.id);

        const uniqueInvitedByIds = [...new Set(invitedByIds.filter(Boolean))];

        const whereClause = {};
        if (userObj.role !== "SUPER_ADMIN" || req.query.viewUserId || uniqueInvitedByIds.length > 0) {
            whereClause.invited_by = { [Op.in]: uniqueInvitedByIds };
        }

        // Search by email only
        if (search) {
            whereClause.email = { [Op.like]: `%${search}%` };
        }

        const invitationType = req.query.type || req.query.invitation_type;
        const targetModel = (invitationType === "affiliate" && db.AffiliateInvitations) ? db.AffiliateInvitations : db.BrokerInvitations;

        // Get total count
        const totalCount = await targetModel.count({
            where: whereClause,
        });

        // Get paginated list ordered by id DESC
        const invitations = await targetModel.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
            limit,
            offset,
        });

        const downloadlinkEnglish = `${process.env.NODE_URL}public/uploads/agreements/broker_pdf_en.pdf`;
        const downloadlinkGerman = `${process.env.NODE_URL}public/uploads/agreements/broker_pdf_de.pdf`;

        return res.status(200).json({
            success: true,
            message: "Invitations retrieved successfully",
            data: {
                downloadlinkEnglish,
                downloadlinkGerman,
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
