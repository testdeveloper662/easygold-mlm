const { kontorError } = require("../utils/kontorErrorCodes");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  let ip = forwarded ? forwarded.split(",")[0].trim() : req.ip || req.socket.remoteAddress;
  if (ip && ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }
  return ip;
};

const kontorIpWhitelist = (req, res, next) => {
  const allowedIps = (process.env.KONTOR_ALLOWED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  const clientIp = getClientIp(req);

  if (!clientIp || !allowedIps.includes(clientIp)) {
    console.warn(`[Kontor] Blocked request from non-whitelisted IP: ${clientIp}`);
    return kontorError(
      res,
      403,
      "FORBIDDEN",
      `Access denied. Your IP address (${clientIp || "unknown"}) is not whitelisted for the Kontor API. Please share this exact IP with the EasyGold MLM team to get it added.`
    );
  }

  next();
};

module.exports = kontorIpWhitelist;
