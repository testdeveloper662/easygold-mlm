// routes/locationRoutes.js

const geoip = require("geoip-lite");

const CheckCountry = async (req, res) => {
    try {
        const ip =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress ||
            req.ip;

        // Handle localhost / IPv6 cases
        const cleanedIp = ip?.replace("::ffff:", "");

        const geo = geoip.lookup(cleanedIp);

        return res.status(200).json({
            success: true,
            ip: cleanedIp,
            country_code: geo?.country || "US",
            city: geo?.city || "",
            timezone: geo?.timezone || ""
        });

    } catch (error) {
        console.error("Country code API error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to detect country"
        });
    }
};

module.exports = CheckCountry;