const express = require("express");
const authRouter = express.Router();

const Login = require("../controller/auth/login");
const ChangePassword = require("../controller/auth/changePassword");
const ForgotPassword = require("../controller/auth/forgotPassword");
const ValidateOTP = require("../controller/auth/validateOTP");
const ResetPassword = require("../controller/auth/resetPassword");
const RegisterBroker = require("../controller/broker/verifyBroker");
const AffiliateRegistration = require("../controller/auth/affiliateRegistration");
const GetPersonTypes = require("../controller/auth/getPersonTypes");
const GetPartnerReferralCode = require("../controller/customer/getPartnerReferralCode");
const GetPublicTermsAndConditions = require("../controller/auth/getPublicTermsAndConditions");
const GetRegisterTerms = require("../controller/auth/getRegisterTerms");

// Auth Routes
authRouter.get("/auth/person-types", GetPersonTypes);
authRouter.post("/auth/login", Login);
authRouter.post("/auth/broker-register", RegisterBroker);
authRouter.post("/auth/affiliate-register", AffiliateRegistration);
authRouter.post("/auth/change-password", ChangePassword);
authRouter.post("/auth/forgot-password", ForgotPassword);
authRouter.post("/auth/otp", ValidateOTP);
authRouter.post("/auth/reset-password", ResetPassword);
authRouter.get("/auth/terms-and-conditions/:document_key", GetPublicTermsAndConditions);
authRouter.get("/auth/register-terms", GetRegisterTerms);

// Partner Referral Routes (Add Customer flow)
authRouter.post("/partner-referral", GetPartnerReferralCode);
authRouter.get("/partner-referral", GetPartnerReferralCode);
authRouter.post("/customer/partner-referral", GetPartnerReferralCode);
authRouter.get("/customer/partner-referral", GetPartnerReferralCode);

module.exports = authRouter;
