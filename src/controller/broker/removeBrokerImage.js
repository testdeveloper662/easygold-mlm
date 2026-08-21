const db = require("../../models");
const fs = require("fs");
const path = require("path");

const RemoveBrokerImage = async (req, res) => {
    try {
        const { user } = req.user; // logged-in user
        const { type } = req.params; // "profile" or "logo"

        if (!["profile", "logo"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid image type",
            });
        }

        // Find broker or affiliate
        let actor = null;
        let isUserTable = false;

        if (user?.role === "SUPER_ADMIN") {
            if (type === "profile") {
                return res.status(400).json({
                    success: false,
                    message: "Admin does not have a profile image to remove",
                });
            }
            actor = await db.Users.findOne({
                where: { ID: user.ID },
            });
            isUserTable = true;
        } else if (user?.role === "BROKER") {
            actor = await db.Brokers.findOne({
                where: { user_id: user.ID },
            });
        } else if (user?.role === "AFFILIATE") {
            actor = await db.Affiliates.findOne({
                where: { user_id: user.ID },
            });
        } else {
            actor = await db.Brokers.findOne({
                where: { user_id: user.ID },
            });
            if (!actor) {
                actor = await db.Affiliates.findOne({
                    where: { user_id: user.ID },
                });
            }
        }

        if (!actor) {
            return res.status(404).json({
                success: false,
                message: "Broker, Affiliate or Admin not found",
            });
        }

        const field = type === "profile" ? "profile_image" : "logo";
        const imagePath = actor[field];

        // Optional: remove file from server if stored in /uploads
        if (imagePath) {
            const fullPath = path.join(__dirname, "../../public/uploads/", imagePath);

            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        // Update database
        actor[field] = null;
        await actor.save();

        return res.json({
            success: true,
            message: `${type} image removed successfully`,
            data: {
                [field]: "",
            },
        });
    } catch (error) {
        console.error("Error removing image:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = RemoveBrokerImage;
