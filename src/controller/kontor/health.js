const KontorHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Kontor API is reachable",
    data: {
      status: "ok",
      server_time: new Date().toISOString(),
    },
  });
};

module.exports = KontorHealth;
