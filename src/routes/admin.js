const express = require("express");
const adminRouter = express.Router();
const authenticateToken = require("../middleware/authentication");

const RegisterBroker = require("../controller/admin/registerBroker");
const GetFixedAffiliateCommissions = require("../controller/admin/getFixedAffiliateCommissions");
const AdjustFixedAffiliateCommissions = require("../controller/admin/adjustFixedAffiliateCommissions");
const GetFixedBrokerCommissions = require("../controller/admin/getFixedBrokerCommissions");
const AdjustFixedBrokerCommissions = require("../controller/admin/adjustFixedBrokerCommissions");
const GetVariableAffiliateCommissions = require("../controller/admin/getVariableAffiliateCommissions");
const AdjustVariableAffiliateCommissions = require("../controller/admin/adjustVariableAffiliateCommissions");
const GetVariableBrokerCommissions = require("../controller/admin/getVariableBrokerCommissions");
const AdjustVariableBrokerCommissions = require("../controller/admin/adjustVariableBrokerCommissions");
const GetAllBrokers = require("../controller/admin/getAllBrokers");
const GetAllBrokerCommissionHistory = require("../controller/admin/getAllBrokerCommissionHistory");
const GetBrokersList = require("../controller/admin/getBrokersList");
const UpdateBrokerPaymentStatus = require("../controller/admin/updateBrokerPaymentStatus");
const GetOrderDetails = require("../controller/admin/getOrderDetails");
const SendPaymentConfirmationEmail = require("../controller/admin/sendPaymentConfirmationEmail");
const SendPaymentDeclineEmail = require("../controller/admin/sendPaymentDeclineEmail");
const GetBrokerPayoutRequests = require("../controller/admin/getBrokerPayoutRequests");
const UpdateBrokerPayoutRequest = require("../controller/admin/updateBrokerPayoutRequest");
const GetAllTargetCustomers = require("../controller/admin/getAllTargetCustomers");
const GetTargetCustomersByBroker = require("../controller/admin/getTargetCustomersByBroker");
const GetTargetCustomerStatsOverall = require("../controller/admin/getTargetCustomerStatsOverall");

// Auth Routes
adminRouter.post("/broker/referral", authenticateToken, RegisterBroker);

adminRouter.get("/broker/fixed-commissions", authenticateToken, GetFixedBrokerCommissions);
adminRouter.post("/broker/fixed-commissions", authenticateToken, AdjustFixedBrokerCommissions);
adminRouter.get("/broker/variable-commissions", authenticateToken, GetVariableBrokerCommissions);
adminRouter.post("/broker/variable-commissions", authenticateToken, AdjustVariableBrokerCommissions);

// Affiliate Commission Levels
adminRouter.get("/affiliate/fixed-commissions", authenticateToken, GetFixedAffiliateCommissions);
adminRouter.post("/affiliate/fixed-commissions", authenticateToken, AdjustFixedAffiliateCommissions);
adminRouter.get("/affiliate/variable-commissions", authenticateToken, GetVariableAffiliateCommissions);
adminRouter.post("/affiliate/variable-commissions", authenticateToken, AdjustVariableAffiliateCommissions);

// Brokers
adminRouter.get("/brokers", authenticateToken, GetAllBrokers);
adminRouter.get("/brokers/list", authenticateToken, GetBrokersList);
adminRouter.get("/commission-history", authenticateToken, GetAllBrokerCommissionHistory);
adminRouter.post("/broker/update-payment-status", authenticateToken, UpdateBrokerPaymentStatus);
adminRouter.post("/commission/send-payment-confirmation-email", authenticateToken, SendPaymentConfirmationEmail);
adminRouter.post("/commission/send-payment-decline-email", authenticateToken, SendPaymentDeclineEmail);
adminRouter.post("/order/detail", authenticateToken, GetOrderDetails);

adminRouter.get("/payout/requests", authenticateToken, GetBrokerPayoutRequests);
adminRouter.put("/payout/request", UpdateBrokerPayoutRequest);

// Target Customers Routes
adminRouter.get("/target-customers", authenticateToken, GetAllTargetCustomers);
adminRouter.get("/target-customers/stats", authenticateToken, GetTargetCustomerStatsOverall);
adminRouter.get("/target-customers/broker/:broker_id", authenticateToken, GetTargetCustomersByBroker);

module.exports = adminRouter;
