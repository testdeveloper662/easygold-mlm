const express = require("express");
const brokerRouter = express.Router();
const authenticateToken = require("../middleware/authentication");
const upload = require("../middleware/multer");

const RegisterBroker = require("../controller/auth/brokerRegistration");
const ReferBroker = require("../controller/broker/referBroker");
const GetBrokerNetwork = require("../controller/broker/getBrokerNetwork");

// Auth Routes
const uploadDocuments = upload("docs");

// brokerRouter.post(
//   "/register",
//   uploadDocuments.fields([
//     { name: "business_license", maxCount: 1 },
//     { name: "passport_front", maxCount: 1 },
//     { name: "passport_back", maxCount: 1 },
//   ]),
//   RegisterBroker
// );
brokerRouter.post("/register", (req, res, next) => {
  const uploadMiddleware = uploadDocuments.fields([
    { name: "business_license", maxCount: 1 },
    { name: "passport_front", maxCount: 1 },
    { name: "passport_back", maxCount: 1 },
  ]);

  uploadMiddleware(req, res, (err) => {
    if (err) {
      // Multer error
      console.error("Multer Error:", err);

      if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors
        return res.status(400).json({
          success: false,
          message: err.message,
          code: err.code,
        });
      } else {
        // Other errors
        return res.status(500).json({
          success: false,
          message: "File upload error",
        });
      }
    }

    // If no error, continue to controller
    RegisterBroker(req, res, next);
  });
});

brokerRouter.post("/referral", authenticateToken, ReferBroker);
brokerRouter.get("/network", authenticateToken, GetBrokerNetwork);

module.exports = brokerRouter;
