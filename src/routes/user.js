const express = require("express");
const userRouter = express.Router();
const CaptureOrder = require("../controller/user/captureOrder");
const CheckCountry = require("../controller/user/checkCountry");

// Order
userRouter.post("/capture-order", CaptureOrder);
userRouter.get("/check-country", CheckCountry);

module.exports = userRouter;
