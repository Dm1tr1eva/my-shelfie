const statsService = require("../services/statsService");
const { statsQuerySchema } = require("../validation/statsSchemas");
const { validate } = require("../validation/validate");

async function getHomeStats(req, res) {
  const now = new Date();
  const { year = now.getUTCFullYear() } = validate(statsQuerySchema, req.query, "query");

  res.json(await statsService.homeStats(req.userId, { year, now }));
}

module.exports = { getHomeStats };
