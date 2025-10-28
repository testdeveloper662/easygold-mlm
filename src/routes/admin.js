const express = require("express");
const adminRouter = express.Router();
const authenticateToken = require("../middleware/authentication");

const RegisterBroker = require("../controller/admin/registerBroker");
const GetFixedBrokerCommissions = require("../controller/admin/getFixedBrokerCommissions");
const AdjustFixedBrokerCommissions = require("../controller/admin/adjustFixedBrokerCommissions");
const GetAllBrokers = require("../controller/admin/getAllBrokers");
const GetAllBrokerCommissionHistory = require("../controller/admin/getAllBrokerCommissionHistory");
const GetBrokersList = require("../controller/admin/getBrokersList");
const UpdateBrokerPaymentStatus = require("../controller/admin/updateBrokerPaymentStatus");

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

// Brokers
adminRouter.get("/brokers", authenticateToken, GetAllBrokers);
adminRouter.get("/brokers/list", authenticateToken, GetBrokersList);
adminRouter.get(
  "/commission-history",
  authenticateToken,
  GetAllBrokerCommissionHistory
);
adminRouter.post(
  "/broker/update-payment-status",
  authenticateToken,
  UpdateBrokerPaymentStatus
);

module.exports = adminRouter;
