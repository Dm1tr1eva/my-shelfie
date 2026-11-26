const { z } = require("zod");

const statsQuerySchema = z
  .object({
    year: z
      .string()
      .regex(/^\d{4}$/, "Expected a four-digit year")
      .transform(Number)
      .pipe(z.number().min(2000).max(2100))
      .optional(),
  })
  .strict();

module.exports = { statsQuerySchema };
