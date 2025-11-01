const express = require("express");
const brokerRouter = express.Router();
const authenticateToken = require("../middleware/authentication");
const upload = require("../middleware/multer");

const ReferBroker = require("../controller/broker/referBroker");
const GetBrokerNetwork = require("../controller/broker/getBrokerNetwork");
const GetBrokerNetworkById = require("../controller/broker/getBrokerNetworkById");
const GetBrokerCommissionHistory = require("../controller/broker/getBrokerCommissionHistory");
const multer = require("multer");
const BrokerRegistration = require("../controller/auth/brokerRegistration");
const GetOrderDetails = require("../controller/broker/getOrderDetails");

// Auth Routes
const uploadDocuments = upload("docs");

brokerRouter.post(
  "/register",
  BrokerRegistration
  //  (req, res, next) => {
  // const uploadMiddleware = uploadDocuments.fields([
  //   { name: "u_trade_register", maxCount: 1 },
  //   { name: "u_travel_id", maxCount: 1 },
  //   { name: "signatureData", maxCount: 1 },
  // ]);

  // uploadMiddleware(req, res, (err) => {
  //   if (err) {
  //     // Multer error
  //     console.error("Multer Error:", err);

  //     if (err instanceof multer.MulterError) {
  //       // Handle Multer-specific errors
  //       return res.status(400).json({
  //         success: false,
  //         message: err.message,
  //         code: err.code,
  //       });
  //     } else {
  //       // Other errors
  //       return res.status(500).json({
  //         success: false,
  //         message: "File upload error",
  //       });
  //     }
  //   }

  // If no error, continue to controller
  // RegisterBroker(req, res, next);
  // });
  // }
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

module.exports = brokerRouter;
