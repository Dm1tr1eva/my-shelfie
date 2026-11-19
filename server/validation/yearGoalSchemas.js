const { z } = require("zod");

const yearGoalSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    books: z.number().int().min(1).max(1000),
  })
  .strict();

module.exports = { yearGoalSchema };
