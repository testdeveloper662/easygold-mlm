const db = require("../../models");

const GetPersonTypes = async (req, res) => {
  try {
    const personTypes = await db.PersonType.findAll({
      attributes: ["id", "value", "label_en", "label_de"],
    });

    return res.status(200).json({
      success: true,
      data: personTypes,
    });
  } catch (error) {
    console.error("Error fetching person types:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = GetPersonTypes;
