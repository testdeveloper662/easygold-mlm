const express = require("express");
const userRouter = express.Router();
const upload = require("../middleware/multer");

// const authenticateToken = require("../middleware/authentication");
const CaptureOrder = require("../controller/user/captureOrder");
const UploadProfileImage = require("../controller/user/uploadProfileImage");
const UploadLogoImage = require("../controller/user/uploadLogoImage");

// Order
userRouter.post("/capture-order", CaptureOrder);

// Image uploads
const uploadProfile = upload("profile").single("image");
const uploadLogo = upload("logo").single("image");

userRouter.post("/:id/profile-image", uploadProfile, UploadProfileImage);
userRouter.post("/:id/logo-image", uploadLogo, UploadLogoImage);

module.exports = userRouter;
