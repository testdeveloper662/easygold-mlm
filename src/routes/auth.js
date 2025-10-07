const express = require("express");
const authRouter = express.Router();

const Login = require("../controller/auth/login");

// Auth Routes
authRouter.post("/auth/login", Login);

module.exports = authRouter;
