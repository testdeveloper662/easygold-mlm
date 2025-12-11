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

        const field = type === "profile" ? "profile_image" : "logo";
        const imagePath = broker[field];

        // Optional: remove file from server if stored in /uploads
        if (imagePath) {
            const fullPath = path.join(__dirname, "../../public/uploads/", imagePath);

            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        // Update database
        broker[field] = null;
        await broker.save();

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
