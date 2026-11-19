const { z } = require("zod");
const { objectId } = require("./objectId");

const createProgressSchema = z
  .object({
    bookId: objectId,
    page: z.number().int().min(0).max(10000).optional(),
    percent: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .refine((data) => (data.page === undefined) !== (data.percent === undefined), {
    message: "Send either page or percent",
  });

module.exports = { createProgressSchema };
