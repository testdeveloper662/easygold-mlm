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
    } else if (product_type == "goldflex") {
      interest_in = "goldflex";
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

    if (targetCustomer.status?.trim().toUpperCase() === "REGISTERED") {
      return res.status(200).json({
        success: false,
        message: "Target customer already registered",
      });
    }

    const broker = await db.Brokers.findOne({
      where: { id: targetCustomer.broker_id },
      raw: true,
    });

    /** 🔹 Get WordPress User */
    const user = await db.Users.findOne({
      where: { ID: broker.user_id },
      raw: true,
    });

    /** 🔹 Get WordPress User Meta */
    const userMetaRows = await db.UsersMeta.findAll({
      where: { user_id: broker.user_id },
      raw: true,
    });

    // Convert meta rows into key/value object
    const userMeta = {};
    userMetaRows.forEach((meta) => {
      userMeta[meta.meta_key] = meta.meta_value;
    });

    const fullAddress = [
      userMeta.u_street_no,
      userMeta.u_street,
      userMeta.u_location,
      userMeta.u_country,
      userMeta.u_postcode
    ]
      .filter(Boolean)
      .join(", ");

    const brokerInfoLine = [
      fullAddress,
      `${user.display_name || ""}, ${userMeta.u_phone || ""}`
    ]
      .filter(Boolean)
      .join(" / ");

    return res.status(200).json({
      success: true,
      message: "Target customer retrieved successfully",
      country,
      language,
      brokerInfoLine
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

