const db = require("../../models");

const getPublicVideos = async (req, res) => {
  try {
    let { page = 1, limit = 12 } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    const offset = (page - 1) * limit;

    const { count, rows } = await db.MarketingMaterial.findAndCountAll({
      where: {
        type: "video",
        is_active: true,
      },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        current_page: page,
        total_pages: Math.ceil(count / limit),
        limit,
        has_next_page: page < Math.ceil(count / limit),
        has_prev_page: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching public videos:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = getPublicVideos;