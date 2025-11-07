const db = require("../../models");
const {
  getUserFromToken,
  uploadProfilePicture,
  generateImageUrl,
} = require("../../utils/Helper");

const UploadProfileImage = async (req, res) => {
  try {
    // ✅ Extract and verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const user = await getUserFromToken(token);
    if (!user || !user?.ID) {
      return res.status(401).json({
        success: false,
        message: "Invalid user token",
      });
    }

    // ✅ Find broker linked to this user
    const brokerDetails = await db.Brokers.findOne({
      where: { user_id: user?.ID },
    });

    if (!brokerDetails) {
      return res.status(404).json({
        success: false,
        message: "Broker not found.",
      });
    }

    // ✅ Validate file input
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    // ✅ Upload profile image (stored under /uploads/profile)
    const filePath = await uploadProfilePicture(
      req.file,
      "../../public/uploads/profile",
      "profile",
      brokerDetails && brokerDetails?.profile_image
    );

    // ✅ Save new path to broker
    if (filePath) {
      brokerDetails.profile_image = filePath;
    }

    const updatedBroker = await brokerDetails.save();

    // ✅ Get user details for response
    const userDetails = await db.Users.findOne({
      where: { id: user?.ID },
    });

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        ...userDetails.dataValues,
        profile_image: updatedBroker.profile_image
          ? await generateImageUrl(updatedBroker.profile_image, "profile")
          : "",
      },
    });
  } catch (error) {
    console.error("Error updating profile image:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = UploadProfileImage;
