require("dotenv").config();

const express = require("express");
const app = express();
const crypto = require("crypto");
const cors = require("cors");
const bodyParser = require("body-parser");
const compression = require("compression");
const path = require("path");
const authRouter = require("./src/routes/auth");
const adminRouter = require("./src/routes/admin");
const brokerRouter = require("./src/routes/broker");
const userRouter = require("./src/routes/user");
const uploadRouter = require("./src/routes/upload");
const kontorRouter = require("./src/routes/kontor");
const kontorIpWhitelist = require("./src/middleware/kontorIpWhitelist");
const getPublicVideos = require("./src/controller/user/getPublicVideos");
const { swaggerUi, swaggerDocs, swaggerUiOptions } = require("./src/swagger/swaggerConfig");

const port = process.env.PORT || 4000;

var corsOptions = {
  origin: "*",
};
app.set("trust proxy", true);
app.use(compression());

app.use(cors(corsOptions));
// Stash the raw request body so HMAC-signature verification (Kontor API)
// can hash the exact bytes the client signed, not a re-serialized copy.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.use(bodyParser.json({ limit: "35mb" }));

// Custom middleware for logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} - ${req.url}`);
  next();
});

// Security and CSP headers middleware
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * 'self' http: https: ws: wss:;"
  );
  next();
});

// Chrome DevTools well-known route
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({});
});

// Swagger Documentation
// no-store: the spec embeds a host-specific "servers" URL built from the
// request, so a cached copy would keep serving a stale (or wrong-host) URL
// to every later visitor.
// Host is read from X-Forwarded-Host first: behind a reverse proxy that
// forwards to this app without rewriting the Host header (the proxy's own
// upstream address, e.g. "localhost:<port>", ends up as the raw Host header
// instead of the public domain), X-Forwarded-Host still carries the real one.
const currentHost = (req) => req.get("x-forwarded-host") || req.get("host");
// Same problem as the host: the proxy terminates TLS and talks plain HTTP to
// this app internally, so req.protocol (even with trust proxy on) resolves
// to "http" unless X-Forwarded-Proto is actually being forwarded. Checking
// it ourselves avoids building an http:// URL on an https:// page, which
// browsers block outright as mixed content.
const currentProtocol = (req) => (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim();
app.use("/api-docs", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  req.swaggerDoc = {
    ...swaggerDocs,
    servers: [{ url: `${currentProtocol(req)}://${currentHost(req)}`, description: "Current Host" }],
  };
  next();
}, swaggerUi.serve, swaggerUi.setup(null, swaggerUiOptions));
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.send({
    ...swaggerDocs,
    servers: [{ url: `${currentProtocol(req)}://${currentHost(req)}`, description: "Current Host" }],
  });
});
app.get("/swagger", (req, res) => res.redirect("/api-docs"));
app.get("/docs", (req, res) => res.redirect("/api-docs"));

// Dev-only helper behind the Swagger UI "Autofill" button — signs a Kontor
// request server-side so KONTOR_HMAC_SECRET never has to reach the browser.
// Disabled outright in production. Kept outside /api-docs on purpose: the
// swagger-ui-express setup middleware answers every request under that
// prefix itself (no path/method check), so it would swallow this route.
if (process.env.NODE_ENV !== "production") {
  app.post("/_dev/kontor-sign", kontorIpWhitelist, (req, res) => {
    const secret = process.env.KONTOR_HMAC_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "KONTOR_HMAC_SECRET is not configured." });
    }

    const rawBody = typeof req.body?.rawBody === "string" ? req.body.rawBody : "";
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${nonce}.${rawBody}`)
      .digest("hex");

    res.json({ timestamp, nonce, signature });
  });
}

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>EasyGold MLM Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 40px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 480px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
          h1 { margin-top: 0; color: #f59e0b; font-size: 26px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.5; }
          .btn { display: inline-block; margin-top: 20px; padding: 12px 28px; background: #f59e0b; color: #0f172a; text-decoration: none; font-weight: bold; border-radius: 8px; transition: background 0.2s; }
          .btn:hover { background: #d97706; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>EasyGold MLM Server 🚀</h1>
          <p>Backend API services are running actively.</p>
          <a class="btn" href="/api-docs">Explore Swagger API Docs →</a>
        </div>
      </body>
    </html>
  `);
});

// Routes
app.use("/api/v1", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/broker", brokerRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/users", userRouter); // Support both singular and plural
app.use("/api/v1/upload-image", uploadRouter); // Support both singular and plural
app.use("/api/v1/kontor", kontorRouter);

const GetExternalCommissionHistoryLogs = require("./src/controller/external/getCommissionHistoryExternal");
app.get("/api/v1/commission-history-logs-external", GetExternalCommissionHistoryLogs);

const GetOrderDetailsExternal = require("./src/controller/external/getOrderDetailsExternal");
app.get("/api/v1/order-details-external", GetOrderDetailsExternal);

const GetExternalBalanceAndBankDetails = require("./src/controller/external/getExternalBalanceAndBankDetails");
app.get("/api/v1/balance-bank-details-external", GetExternalBalanceAndBankDetails);

const AddExternalBankDetails = require("./src/controller/external/addExternalBankDetails");
app.post("/api/v1/bank-details-external", AddExternalBankDetails);

const UpdateExternalBankDetails = require("./src/controller/external/updateExternalBankDetails");
app.put("/api/v1/bank-details-external", UpdateExternalBankDetails);

const CreateExternalPayoutRequest = require("./src/controller/external/createExternalPayoutRequest");
app.post("/api/v1/payout-request-external", CreateExternalPayoutRequest);

const GetExternalPayoutRequests = require("./src/controller/external/getExternalPayoutRequests");
app.get("/api/v1/payout-request-external", GetExternalPayoutRequests);

app.get("/api/v1/public/videos", getPublicVideos);

app.listen(port, () => {
  console.log(`Server running on PORT: ${port} 🚀`);
  console.log(`Swagger API Docs available at: http://localhost:${port}/api-docs 📚`);
});
