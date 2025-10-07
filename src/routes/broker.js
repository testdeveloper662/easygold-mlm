const express = require("express");
const brokerRouter = express.Router();
const authenticateToken = require("../middleware/authentication");

const RegisterBroker = require("../controller/broker/registerBroker");
const GetBrokerNetwork = require("../controller/broker/getBrokerNetwork");

// Auth Routes
brokerRouter.post("/referral", authenticateToken, RegisterBroker);
brokerRouter.get("/network", authenticateToken, GetBrokerNetwork);

module.exports = brokerRouter;
