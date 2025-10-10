const express = require("express");
const adminRouter = express.Router();
const authenticateToken = require("../middleware/authentication");

const RegisterBroker = require("../controller/admin/registerBroker");
const GetFixedBrokerCommissions = require("../controller/admin/getFixedBrokerCommissions");
const AdjustFixedBrokerCommissions = require("../controller/admin/adjustFixedBrokerCommissions");

// Auth Routes
adminRouter.post("/broker/referral", authenticateToken, RegisterBroker);

// Commission Levels
adminRouter.get(
  "/broker/fixed-commissions",
  authenticateToken,
  GetFixedBrokerCommissions
);
adminRouter.post(
  "/broker/fixed-commissions",
  authenticateToken,
  AdjustFixedBrokerCommissions
);

module.exports = adminRouter;
