require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const authRouter = require("./src/routes/auth");
const adminRouter = require("./src/routes/admin");
const brokerRouter = require("./src/routes/broker");
const userRouter = require("./src/routes/user");
const fileUpload = require("express-fileupload");

const port = process.env.PORT || 4000;

var corsOptions = {
  origin: "*",
  allowedHeaders: ["Content-Type", "Authorization", "public-request"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(path.join(__dirname, "public")));

app.use(bodyParser.json({ limit: "35mb" }));

// Skip urlencoded and express-fileupload for multer routes
app.use((req, res, next) => {
  if (req.path.includes("/profile-image") || req.path.includes("/logo-image")) {
    return next();
  }
  bodyParser.urlencoded({ extended: true })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.includes("/profile-image") || req.path.includes("/logo-image")) {
    return next();
  }
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    limits: { fileSize: 50 * 1024 * 1024 },
  })(req, res, next);
});

// Custom middleware for logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} - ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.send("MLM server...");
});

// Routes
app.use("/api/v1", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/broker", brokerRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/users", userRouter); // Support both singular and plural

app.listen(port, () => {
  console.log(`Server running on PORT: ${port} 🚀`);
});
