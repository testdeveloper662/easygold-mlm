const db = require("../../models");

const InvitationCreateUpdate = async (req, res) => {
    try {
        const { email, invitation_status, last_invitation_sent } = req.body;

        if (!email) {
            return res.status(400).json({
                success: true,
                message: "Email is required."
            });
        }
        const invitation = await db.BrokerInvitations.findOne({
            where: {
                email
            },
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation record not found",
            });
        }

        // Build update object dynamically (partial updates allowed)
        const updateData = {};

        if (email !== undefined) updateData.email = email;
        if (invitation_status !== undefined) updateData.invitation_status = invitation_status;
        if (last_invitation_sent !== undefined) updateData.last_invitation_sent = last_invitation_sent;

        await invitation.update(updateData);

        return res.status(200).json({
            success: true,
            message: "Invitation updated successfully",
            data: invitation,
        });
    } catch (error) {
        console.error("Error in invitationCreateUpdate:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

module.exports = InvitationCreateUpdate;
