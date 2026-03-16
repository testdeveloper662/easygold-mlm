const express = require("express");
const adminRouter = express.Router();
const authenticateToken = require("../middleware/authentication");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// Set up multer
const uploadPath = path.join(__dirname, "../../public/uploads/contracts");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {

        // Create directory if it does not exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(null, uniqueName + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

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
const GetBrokerBankDetails = require("../controller/admin/getBrokerBankDetails");
const GetCustomerDetails = require("../controller/admin/getCustomerDetails");
const GetAllAdminContracts = require("../controller/admin/getAllAdminContracts");
const GetAdminContractsById = require("../controller/admin/getAdminContractsById");
const UpdateAdminContract = require("../controller/admin/updateAdminContract");

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
adminRouter.post("/customer/detail", authenticateToken, GetCustomerDetails);

adminRouter.get("/payout/requests", authenticateToken, GetBrokerPayoutRequests);
adminRouter.put("/payout/request", UpdateBrokerPayoutRequest);

adminRouter.get("/broker/:brokerId/bank-details", authenticateToken, GetBrokerBankDetails);

// Target Customers Routes
adminRouter.get("/target-customers", authenticateToken, GetAllTargetCustomers);
adminRouter.get("/target-customers/stats", authenticateToken, GetTargetCustomerStatsOverall);
adminRouter.get("/target-customers/broker/:broker_id", authenticateToken, GetTargetCustomersByBroker);

//Admin Contracts Routes
adminRouter.get("/admin-contracts", authenticateToken, GetAllAdminContracts);
adminRouter.get("/admin-contracts/:id", authenticateToken, GetAdminContractsById);
adminRouter.put("/admin-contracts/:id", authenticateToken, upload.fields([
    { name: "english_pdf_file", maxCount: 1 },
    { name: "german_pdf_file", maxCount: 1 },
]), UpdateAdminContract);

module.exports = adminRouter;
