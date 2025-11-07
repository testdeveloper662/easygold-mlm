const express = require("express");
const userRouter = express.Router();
const CaptureOrder = require("../controller/user/captureOrder");

// Order
userRouter.post("/capture-order", CaptureOrder);

module.exports = userRouter;
