const express = require("express");
const kontorRouter = express.Router();

const kontorIpWhitelist = require("../middleware/kontorIpWhitelist");
const kontorHmacAuth = require("../middleware/kontorHmacAuth");

const GetKontorHealth = require("../controller/kontor/health");
const CheckKontorReferralCode = require("../controller/kontor/checkReferralCode");
const GetKontorDailyReconciliation = require("../controller/kontor/getDailyReconciliation");
const PostKontorDailyReconciliation = require("../controller/kontor/postReconciliationDaily");
const PostKontorAcknowledgement = require("../controller/kontor/postAcknowledgement");
const RegisterKontorBroker = require("../controller/kontor/registerBroker");
const UpdateKontorBroker = require("../controller/kontor/updateBroker");
const UpdateKontorBrokerStatus = require("../controller/kontor/updateBrokerStatus");
const GetKontorPartners = require("../controller/kontor/getPartners");
const GetKontorPartnerByCustomerNo = require("../controller/kontor/getPartnerByCustomerNo");
const CaptureKontorOrder = require("../controller/kontor/captureOrder");
const ReverseKontorOrder = require("../controller/kontor/captureOrderReverse");
const GetKontorTransactions = require("../controller/kontor/getTransactions");
const GetKontorTransactionById = require("../controller/kontor/getTransactionById");

// Every /api/v1/kontor/* route is restricted to Kontor's allow-listed IPs
// and requires a valid HMAC-SHA256 request signature — no endpoint is
// exempt, including the read-only ones, per the agreed security model.
kontorRouter.use(kontorIpWhitelist);
kontorRouter.use(kontorHmacAuth);

kontorRouter.get("/health", GetKontorHealth);
kontorRouter.get("/referral-code/check", CheckKontorReferralCode);

// Reconciliation: GET returns our totals, POST takes Kontor's own totals
// and compares them against ours.
kontorRouter.get("/reconciliation/daily", GetKontorDailyReconciliation);
kontorRouter.post("/reconciliation/daily", PostKontorDailyReconciliation);

kontorRouter.post("/acknowledgements", PostKontorAcknowledgement);

// Broker lifecycle. Kontor never sends files/ID/KYC data, so this is JSON-only.
kontorRouter.post("/broker/register", RegisterKontorBroker);
kontorRouter.put("/broker/update", UpdateKontorBroker);
kontorRouter.post("/broker/status", UpdateKontorBrokerStatus);
kontorRouter.get("/partners", GetKontorPartners);
kontorRouter.get("/partners/:customer_no", GetKontorPartnerByCustomerNo);

// Commission booking.
kontorRouter.post("/capture-order", CaptureKontorOrder);
kontorRouter.post("/capture-order/reverse", ReverseKontorOrder);
kontorRouter.get("/transactions", GetKontorTransactions);
kontorRouter.get("/transactions/:entry_id", GetKontorTransactionById);

module.exports = kontorRouter;
