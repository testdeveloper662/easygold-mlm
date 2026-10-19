const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Import modular path specifications
const authDocs = require("./docs/auth.swagger");
const adminDocs = require("./docs/admin.swagger");
const brokerDocs = require("./docs/broker.swagger");
const userDocs = require("./docs/user.swagger");
const externalDocs = require("./docs/external.swagger");
const uploadDocs = require("./docs/upload.swagger");

// Combine all pre-defined paths
const combinedPaths = {
  ...authDocs,
  ...brokerDocs,
  ...adminDocs,
  ...userDocs,
  ...externalDocs,
  ...uploadDocs,
};

const port = process.env.PORT || 4000;

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "EasyGold MLM Backend API",
    version: "1.0.0",
    description: `
### EasyGold Multi-Level Marketing (MLM) Platform Backend API

This interactive documentation covers all backend REST endpoints for the EasyGold MLM platform.

#### Key Modules:
- **Auth**: User/Broker/Affiliate authentication, registration, password recovery, OTP validation, and referral validation.
- **Admin**: System management for brokers, affiliates, multi-tier fixed/variable commission rules, contracts, and marketing assets.
- **Broker**: Downline network hierarchy, real-time dashboard analytics, customer referrals, bank payouts, and marketing tools.
- **User & Orders**: Order processing, MLM commission calculation/distribution engine, and IP geo-lookup.
- **External APIs**: Integration endpoints for third-party dashboards (GoldFlex, EasyGold Token, PrimeInvest) to synchronize commissions, balance, bank details, and payouts.
- **Upload**: File & media upload pipelines.

#### Authentication:
Protected endpoints require a JWT Bearer token. Use the **Authorize** button below with your token from \`POST /api/v1/auth/login\`.
Format: \`<your_jwt_token>\` (or \`Bearer <your_jwt_token>\`).
    `,
    contact: {
      name: "EasyGold Technical Support",
      email: "support@easygold.ch",
    },
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: "Current Local Server",
    },
    {
      url: "/",
      description: "Relative (Current Host)",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication, Registration & Referral Verification" },
    { name: "Admin - Brokers & Affiliates", description: "Broker & Affiliate approval, status, and network contracts" },
    { name: "Admin - Commissions", description: "Fixed/variable commissions, manual adjustments, and payout confirmation" },
    { name: "Admin - Customers", description: "Lead management and referral log status" },
    { name: "Admin - Contracts & Terms", description: "Contract agreements, legal terms & PDF documents" },
    { name: "Admin - Marketing", description: "Admin marketing materials (banners, videos, PDFs)" },
    { name: "Broker - Profile & Network", description: "Downline network, upline hierarchy, and profile branding" },
    { name: "Broker - Commissions & Payouts", description: "Commissions logs, bank account info, and payout withdrawals" },
    { name: "Broker - Target Customers", description: "Target customer lead generation, contracts, and tracking" },
    { name: "Broker - Marketing & Invitations", description: "Affiliate banners, invitations, and assets" },
    { name: "User & Orders", description: "Order capture engine, preview calculator, and location services" },
    { name: "External APIs", description: "External partner & customer dashboard endpoints" },
    { name: "Upload", description: "Media and document upload endpoints" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from /api/v1/auth/login",
      },
    },
  },
  paths: combinedPaths,
};

// Also scan routes for any inline JSDoc annotations
const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.js", "./index.js"],
};

const swaggerDocs = swaggerJsdoc(options);

// Custom UI styling for premium look & feel
const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .swagger-ui .info { margin: 25px 0; }
  .swagger-ui .info .title { font-size: 32px; color: #1e293b; font-weight: 700; }
  .swagger-ui .btn.authorize { background-color: #d97706; border-color: #d97706; color: #fff; font-weight: 600; border-radius: 6px; }
  .swagger-ui .btn.authorize svg { fill: #fff; }
  .swagger-ui .opblock.opblock-post { border-color: #4f46e5; background: rgba(79, 70, 229, 0.05); }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #4f46e5; }
  .swagger-ui .opblock.opblock-get { border-color: #059669; background: rgba(5, 150, 105, 0.05); }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #059669; }
  .swagger-ui .opblock.opblock-put { border-color: #d97706; background: rgba(217, 119, 6, 0.05); }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #d97706; }
  .swagger-ui .opblock.opblock-delete { border-color: #dc2626; background: rgba(220, 38, 38, 0.05); }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #dc2626; }
  .swagger-ui .opblock { border-radius: 8px; margin-bottom: 12px; }
`;

const swaggerUiOptions = {
  explorer: true,
  customCss,
  customSiteTitle: "EasyGold MLM - API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: "none",
    filter: true,
    tagsSorter: "alpha",
  },
};

module.exports = {
  swaggerUi,
  swaggerDocs,
  swaggerUiOptions,
};
