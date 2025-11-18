const express = require("express");
const brokerRouter = express.Router();
const authenticateToken = require("../middleware/authentication");
const multer = require("multer");
// Set up multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ReferBroker = require("../controller/broker/referBroker");
const GetBrokerNetwork = require("../controller/broker/getBrokerNetwork");
const GetBrokerNetworkById = require("../controller/broker/getBrokerNetworkById");
const GetBrokerCommissionHistory = require("../controller/broker/getBrokerCommissionHistory");
const BrokerRegistration = require("../controller/auth/brokerRegistration");
const GetOrderDetails = require("../controller/broker/getOrderDetails");
const UploadLogoImage = require("../controller/user/uploadLogoImage");
const UploadProfileImage = require("../controller/user/uploadProfileImage");
const AddUpdateBrokerBankDetails = require("../controller/broker/addUpdateBrokerBankDetails");
const GetBrokerBankDetails = require("../controller/broker/getBrokerBankDetails");
const CreateBrokerPayoutRequest = require("../controller/broker/createBrokerPayoutRequest");
const CreateTargetCustomer = require("../controller/broker/createTargetCustomer");
const GetTargetCustomers = require("../controller/broker/getTargetCustomers");
const GetTargetCustomerById = require("../controller/broker/getTargetCustomerById");
const UpdateTargetCustomer = require("../controller/broker/updateTargetCustomer");
const DeleteTargetCustomer = require("../controller/broker/deleteTargetCustomer");
const GetTargetCustomerStats = require("../controller/broker/getTargetCustomerStats");
const GetDashboardData = require("../controller/broker/getDashboardData");

brokerRouter.post(
  "/register",
  upload.fields([
    { name: "u_trade_register", maxCount: 1 },
    { name: "u_travel_id", maxCount: 1 },
    { name: "signatureData", maxCount: 1 },
  ]),
  BrokerRegistration
);

brokerRouter.post("/referral", authenticateToken, ReferBroker);
brokerRouter.get("/network", authenticateToken, GetBrokerNetwork);
brokerRouter.get("/network/:broker_id", authenticateToken, GetBrokerNetworkById);
brokerRouter.get("/commissions/:id", authenticateToken, GetBrokerCommissionHistory);
brokerRouter.post("/order/detail", authenticateToken, GetOrderDetails);
brokerRouter.post("/logo-image", authenticateToken, upload.single("logo"), UploadLogoImage);
brokerRouter.post("/profile-image", authenticateToken, upload.single("profile"), UploadProfileImage);

brokerRouter.post("/bank/detail", authenticateToken, AddUpdateBrokerBankDetails);
brokerRouter.get("/bank/detail", authenticateToken, GetBrokerBankDetails);
brokerRouter.post("/payout/request", authenticateToken, CreateBrokerPayoutRequest);

// Target Customers Routes
brokerRouter.post("/target-customers", authenticateToken, CreateTargetCustomer);
brokerRouter.get("/target-customers", authenticateToken, GetTargetCustomers);
brokerRouter.get("/target-customers/stats", authenticateToken, GetTargetCustomerStats);
brokerRouter.get("/target-customers/:id", authenticateToken, GetTargetCustomerById);
brokerRouter.put("/target-customers/:id", authenticateToken, UpdateTargetCustomer);
brokerRouter.delete("/target-customers/:id", authenticateToken, DeleteTargetCustomer);

// Dashboard
brokerRouter.get("/dashboard", authenticateToken, GetDashboardData);

module.exports = brokerRouter;
