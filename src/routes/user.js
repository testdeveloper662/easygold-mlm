const express = require("express");
const userRouter = express.Router();
const CaptureOrder = require("../controller/user/captureOrder");
const CaptureOrderPreview = require("../controller/user/captureOrderPreview");
const CheckCountry = require("../controller/user/checkCountry");

// Order
userRouter.post("/capture-order", CaptureOrder);
userRouter.post("/capture-order/preview", CaptureOrderPreview);
userRouter.get("/check-country", CheckCountry);

module.exports = userRouter;
