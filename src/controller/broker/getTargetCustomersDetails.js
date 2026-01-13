const db = require("../../models");
const geoip = require("geoip-lite");

const GERMAN_COUNTRIES = ["DE", "AT", "CH"];

const GetTargetCustomersDetails = async (req, res) => {
  try {
    let ip =
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const geo = geoip.lookup(ip);
    const country = geo?.country || "US";

    let language = GERMAN_COUNTRIES.includes(country) ? "de" : "en";

    const { email, product_type } = req.query;

    let interest_in;
    if (product_type == "easygold") {
      interest_in = "easygold Token";
    } else if (product_type == "primeinvest") {
      interest_in = "Primeinvest";
    }

    // Get target customer
    const targetCustomer = await db.TargetCustomers.findOne({
      where: {
        customer_email: email,
        interest_in: interest_in.trim(), // Ensure broker can only access their own customers
      },
      raw: true
    });

    if (!targetCustomer) {
      return res.status(200).json({
        success: false,
        notfound: true,
        message: "Target customer not found",
      });
    }

    console.log(targetCustomer, "targetCustomer");

    if (targetCustomer.status?.trim().toUpperCase() === "REGISTERED") {
      return res.status(200).json({
        success: false,
        message: "Target customer already registered",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Target customer retrieved successfully",
      country,
      language
    });
  } catch (error) {
    console.error("Error fetching target customer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = GetTargetCustomersDetails;

