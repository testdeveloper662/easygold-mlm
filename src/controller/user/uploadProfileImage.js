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

    if (user?.role === "SUPER_ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Profile image upload is not supported for Admin.",
      });
    }

    // ✅ Find broker or affiliate linked to this user
    let actorDetails = null;

    if (user?.role === "BROKER") {
      actorDetails = await db.Brokers.findOne({
        where: { user_id: user?.ID }
      });
    } else if (user?.role === "AFFILIATE") {
      actorDetails = await db.Affiliates.findOne({
        where: { user_id: user?.ID }
      });
    } else {
      actorDetails = await db.Brokers.findOne({
        where: { user_id: user?.ID }
      });
      if (!actorDetails) {
        actorDetails = await db.Affiliates.findOne({
          where: { user_id: user?.ID }
        });
      }
    }

    if (!actorDetails) {
      return res.status(404).json({
        success: false,
        message: "Broker or Affiliate not found.",
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
    const uploadedPath = await uploadProfilePicture(
      req.file,
      "profile",                 // folder in /public/uploads
      "profile",
      actorDetails.profile_image // delete old file
    );

    // Save in DB
    if (uploadedPath) {
      actorDetails.profile_image = uploadedPath;
    }

    const updatedActor = await actorDetails.save();

    // ✅ Get user details for response
    const userDetails = await db.Users.findOne({
      where: { id: user?.ID },
    });

    return res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        ...userDetails.dataValues,
        profile_image: updatedActor.profile_image
          ? await generateImageUrl(updatedActor.profile_image, "profile")
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
