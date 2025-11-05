const db = require("../../models");

const UploadLogoImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const user = await db.Users.findOne({ where: { ID: id }, attributes: ["ID"] });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const imageUrl = `/public/uploads/logo/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: "Logo image updated successfully",
      imageUrl,
    });
  } catch (error) {
    console.error("Error updating logo image:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = UploadLogoImage;

