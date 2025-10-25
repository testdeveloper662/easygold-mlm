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

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

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

app.listen(port, () => {
  console.log(`Server running on PORT: ${port} 🚀`);
});
