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
brokerRouter.get(
  "/network/:broker_id",
  authenticateToken,
  GetBrokerNetworkById
);
brokerRouter.get(
  "/commissions/:id",
  authenticateToken,
  GetBrokerCommissionHistory
);
brokerRouter.post("/order/detail", authenticateToken, GetOrderDetails);
brokerRouter.post("/logo-image", authenticateToken, upload.single("logo"), UploadLogoImage);
brokerRouter.post("/profile-image", authenticateToken, upload.single("profile"), UploadProfileImage);

module.exports = brokerRouter;
