const db = require("../../models");

const GetAllBrokers = async (req, res) => {
  try {
    const { user } = req.user;

    if (user.role !== "SUPER_ADMIN") {
      return res.status(400).json({
        success: false,
        message: "Access not allowed",
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: brokers } = await db.Brokers.findAndCountAll({
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: [
            "id",
            "fullName",
            "email",
            "company",
            "referral_code",
            "phone",
            "mobile",
            "address",
            "city",
            "country",
            "postalCode",
            "contactPerson",
            "website",
            "username",
            "iban",
            "bic",
            "bankName",
            "bankAddress",
            "role",
            "business_license",
            "passport_front",
            "passport_back",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format response
    const brokerData = brokers.map((broker) => {
      const u = broker.user;
      return {
        broker_id: broker.id,
        user_id: u.id,
        fullName: u.fullName,
        email: u.email,
        company: u.company,
        referral_code: u.referral_code,
        phone: u.phone,
        mobile: u.mobile,
        address: u.address,
        city: u.city,
        country: u.country,
        postalCode: u.postalCode,
        contactPerson: u.contactPerson,
        website: u.website,
        username: u.username,
        iban: u.iban,
        bic: u.bic,
        bankName: u.bankName,
        bankAddress: u.bankAddress,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        business_license: u.business_license
          ? `${process.env.PUBLIC_URL}/uploads/docs/${u.business_license}`
          : null,
        passport_front: u.passport_front
          ? `${process.env.PUBLIC_URL}/uploads/docs/${u.passport_front}`
          : null,
        passport_back: u.passport_back
          ? `${process.env.PUBLIC_URL}/uploads/docs/${u.passport_back}`
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "All Brokers data",
      data: {
        brokers: brokerData,
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching brokers:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = GetAllBrokers;
