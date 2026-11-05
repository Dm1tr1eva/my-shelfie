const { z } = require("zod");
const { LINK_LANGUAGES, SERIES_STATUSES } = require("../constants/library");
const { genreName } = require("./genre");

const nextToBuyQuerySchema = z.object({
  language: z.enum(LINK_LANGUAGES).optional(),
  genre: genreName.optional(),
  trope: z.string().trim().min(1).max(60).optional(),
  seriesStatus: z.enum(SERIES_STATUSES).optional(),
});

module.exports = { nextToBuyQuerySchema };
