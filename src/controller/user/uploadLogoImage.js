const db = require("../../models");
const { getUserFromToken, uploadProfilePicture, generateImageUrl } = require("../../utils/Helper");

const UploadLogoImage = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const user = await getUserFromToken(token);

    const brokerDetails = await db.Brokers.findOne({
      where: {
        user_id: user?.ID
      }
    });
    console.log("============brokerDetails = ", brokerDetails);

    if (!brokerDetails) {
      return res.status(404).json({
        success: false,
        message: "Broker not exist.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }
    console.log("brokerDetails && brokerDetails?.logo = ", brokerDetails && brokerDetails?.logo != null);

    const filePath = await uploadProfilePicture(
      req.file,
      "logo",
      "logo",
      brokerDetails && brokerDetails?.logo
    );

    if (filePath) {
      brokerDetails.logo = filePath;
    }
    const updatedBroker = await brokerDetails.save();
    const userDetails = await db.Users.findOne({
      where: {
        id: user?.ID
      }
    })

    return res.status(200).json({
      success: true,
      message: "Logo image updated successfully",
      data: {
        ...userDetails.dataValues,
        logo: updatedBroker.logo
          ? await generateImageUrl(updatedBroker.logo, "logo")
          : "",
      },
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

