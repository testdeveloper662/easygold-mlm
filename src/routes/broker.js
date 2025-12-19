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
const InvitationCreateUpdate = require("../controller/broker/invitationCreateUpdate");
const GetInvitations = require("../controller/broker/invitationsGet");
const CreateAffiliateBanner = require("../controller/broker/createAffiliateBanner");
const GetAffiliateBanner = require("../controller/broker/getAffiliateBanner");
const GetAffiliateBannerById = require("../controller/broker/getAffiliateBannerById");
const UpdateAffiliateBanner = require("../controller/broker/updateAffiliateBanner");
const DeleteAffiliateBanner = require("../controller/broker/deleteAffiliateBanner");
const GetUserUrls = require("../controller/broker/getUserUrls");
const RemoveBrokerImage = require("../controller/broker/removeBrokerImage");
const GetReferralDetails = require("../controller/broker/getReferralDetails");
const GetAllBrokers = require("../controller/broker/getAllBrokers");
const customerSignupEasyGoldToken = require("../controller/broker/customerSignupEasyGoldToken");

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
brokerRouter.get("/referralname", GetReferralDetails);
brokerRouter.get("/network/:broker_id", authenticateToken, GetBrokerNetworkById);
brokerRouter.get("/commissions/:id", authenticateToken, GetBrokerCommissionHistory);
brokerRouter.post("/order/detail", authenticateToken, GetOrderDetails);
brokerRouter.post("/logo-image", authenticateToken, upload.single("logo"), UploadLogoImage);
brokerRouter.post("/profile-image", authenticateToken, upload.single("profile"), UploadProfileImage);

brokerRouter.get("/getuserurls", authenticateToken, GetUserUrls);
brokerRouter.post("/affiliate-banners", authenticateToken, upload.single("backgroundImage"), CreateAffiliateBanner);
brokerRouter.get("/affiliate-banners", authenticateToken, GetAffiliateBanner);
brokerRouter.get("/affiliate-banners/:id", authenticateToken, GetAffiliateBannerById);
brokerRouter.put("/affiliate-banners/:id", authenticateToken, upload.single("backgroundImage"), UpdateAffiliateBanner);
brokerRouter.delete("/affiliate-banners/:id", authenticateToken, DeleteAffiliateBanner);

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

brokerRouter.get("/brokers", authenticateToken, GetAllBrokers);
brokerRouter.post("/target-customers/signup", customerSignupEasyGoldToken);

// Dashboard
brokerRouter.get("/dashboard", authenticateToken, GetDashboardData);

brokerRouter.delete("/remove-brocker-image/:type", authenticateToken, RemoveBrokerImage);

//Invitation
brokerRouter.post("/invitation", InvitationCreateUpdate);
brokerRouter.get("/invitations", authenticateToken, GetInvitations);


module.exports = brokerRouter;
