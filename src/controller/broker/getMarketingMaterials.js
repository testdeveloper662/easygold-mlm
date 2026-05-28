const db = require("../../models");

const getMarketingMaterialsForBroker = async (req, res) => {
  try {
    const { page = 1, limit = 12, type } = req.query;

    const { user } = req.user;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const broker = await db.Brokers.findOne({
      where: { user_id: user.ID },
      attributes: ["id", "referral_code"],
      include: [
        {
          model: db.Users,
          as: "user",
          attributes: ["display_name", "landing_page", "mystorekey", "user_email"]
        }
      ]
    });

    const whereClause = { is_active: true };

    if (type) {
      if (type === "document") {
        whereClause.type = { [db.Sequelize.Op.in]: ["pdf", "document"] };
      } else {
        whereClause.type = type;
      }
    }

    const { count, rows } = await db.MarketingMaterial.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: limitNumber,
      offset: offset,
    });

    const materialsWithFullUrl = rows.map((m) => ({
      ...m.toJSON(),
      recommend_code: broker.user.mystorekey,
      asset_url: m.asset_url ? `${process.env.NODE_URL}${m.asset_url}` : null,
      youtube_url: m.type !== "video" ? (m.youtube_url ? `${m.youtube_url}${broker.user.mystorekey}` : null) : (m.youtube_url ? `${m.youtube_url}` : null),
      german_youtube_url: m.type !== "video" ? (m.german_youtube_url ? `${m.german_youtube_url}${broker.user.mystorekey}` : null) : (m.german_youtube_url ? `${m.german_youtube_url}` : null),
    }));

    return res.status(200).json({
      success: true,
      data: materialsWithFullUrl,
      total: count,
      page: pageNumber,
      totalPages: Math.ceil(count / limitNumber),
    });
  } catch (error) {
    console.error("Error fetching marketing materials for broker:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = getMarketingMaterialsForBroker;
