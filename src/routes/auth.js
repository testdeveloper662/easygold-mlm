const express = require("express");
const authRouter = express.Router();

const Login = require("../controller/auth/login");
const ChangePassword = require("../controller/auth/changePassword");
const ValidateOTP = require("../controller/auth/validateOTP");
const ResetPassword = require("../controller/auth/resetPassword");
const RegisterBroker = require("../controller/broker/verifyBroker");
const AffiliateRegistration = require("../controller/auth/affiliateRegistration");
const GetPersonTypes = require("../controller/auth/getPersonTypes");

// Auth Routes
authRouter.get("/auth/person-types", GetPersonTypes);
authRouter.post("/auth/login", Login);
authRouter.post("/auth/broker-register", RegisterBroker);
authRouter.post("/auth/affiliate-register", AffiliateRegistration);
authRouter.post("/auth/change-password", ChangePassword);
authRouter.post("/auth/otp", ValidateOTP);
authRouter.post("/auth/reset-password", ResetPassword);

module.exports = authRouter;
