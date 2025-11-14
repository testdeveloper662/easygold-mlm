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
const GetOrderDetails = require("../controller/admin/getOrderDetails");
const GetBrokerPayoutRequests = require("../controller/admin/getBrokerPayoutRequests");
const UpdateBrokerPayoutRequest = require("../controller/admin/updateBrokerPayoutRequest");

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
adminRouter.post("/order/detail", authenticateToken, GetOrderDetails);

adminRouter.get("/payout/requests", authenticateToken, GetBrokerPayoutRequests);
adminRouter.put("/payout/request", UpdateBrokerPayoutRequest);

module.exports = adminRouter;
