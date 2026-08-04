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
      
      console.log(err);
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

    // Check user active status in database
    const userId = user.user?.ID || user.user?.id || user.ID || user.id;
    if (userId) {
      const db = require("../models");
      db.Users.findByPk(userId, { attributes: ["user_status", "deleted_at"] })
        .then((dbUser) => {
          if (!dbUser || dbUser.deleted_at !== null) {
            return res.status(401).send({
              success: false,
              message: "Account no longer exists.",
            });
          }
          if (dbUser.user_status !== 0) {
            const isDeactivated = dbUser.user_status === 1;
            return res.status(403).send({
              success: false,
              message: isDeactivated
                ? "Your account is deactivated/inactive. Access denied."
                : "Your profile is under review. Access denied.",
              account_status: dbUser.user_status,
            });
          }
          next();
        })
        .catch((dbErr) => {
          console.error("[AuthenticateToken] Error checking user status:", dbErr);
          next();
        });
    } else {
      next();
    }
  });
};

module.exports = authenticateToken;
