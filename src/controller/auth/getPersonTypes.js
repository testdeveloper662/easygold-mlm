const db = require("../../models");

const GetPersonTypes = async (req, res) => {
  try {
    let personTypes = await db.PersonType.findAll({
      attributes: ["id", "value", "label_en", "label_de"],
    });

    const desiredOrder = ["business", "affiliate", "private_individual"];
    const filteredAndOrdered = desiredOrder
      .map((val) => {
        return personTypes.find(
          (pt) => pt.value === val || (val === "business" && pt.value === "company")
        );
      })
      .filter(Boolean)
      .map((pt) => {
        if (pt.value === "company") {
          return {
            id: pt.id,
            value: "business",
            label_en: "Business",
            label_de: "Unternehmen",
          };
        }
        return pt;
      });

    return res.status(200).json({
      success: true,
      data: filteredAndOrdered,
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
