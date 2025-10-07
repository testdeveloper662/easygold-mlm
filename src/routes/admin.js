const express = require("express");
const adminRouter = express.Router();
const authenticateToken = require("../middleware/authentication");

const RegisterBroker = require("../controller/admin/registerBroker");

// Auth Routes
adminRouter.post("/broker/referral", authenticateToken, RegisterBroker);

module.exports = adminRouter;
