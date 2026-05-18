const db = require("../../models");
const fs = require("fs");
const path = require("path");

const deleteMarketingMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await db.MarketingMaterial.findByPk(id);

    if (!material) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (material.asset_url) {
      const filePath = path.join(__dirname, "../../../public", material.asset_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await material.destroy();

    return res.status(200).json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting marketing material:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = deleteMarketingMaterial;
