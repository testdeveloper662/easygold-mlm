const jwt = require("jsonwebtoken");
const JWT_ACCESS_TOKEN = process.env.JWT_ACCESS_TOKEN;

let finalResults = {
  noToken: "Token not provided.",
  invalidToken: "Unauthorized token provided",
  expiredToken: "Token Expired",
};

let authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.status(401).send({
      success: false,
      message: finalResults.noToken,
    });
  }

  jwt.verify(token, JWT_ACCESS_TOKEN, (err, user) => {
    if (user && !user.exp) {
      return res.status(403).send({
        success: false,
        message: finalResults.expiredToken,
      });
    }

    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).send({
          success: false,
          message: finalResults.expiredToken,
        });
      } else {
        return res.status(403).send({
          success: false,
          message: finalResults.invalidToken,
        });
      }
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
