const seriesLookupService = require("../services/seriesLookupService");
const { seriesLookupSchema } = require("../validation/seriesLookupSchemas");
const { validate } = require("../validation/validate");
const { toSeriesLookupDto } = require("../dto/seriesLookupDto");

async function lookUpSeries(req, res) {
  const query = validate(seriesLookupSchema, req.body);

  const outcome = await seriesLookupService.lookUpSeries(req.userId, query);
  res.json(toSeriesLookupDto(outcome));
}

module.exports = { lookUpSeries };
