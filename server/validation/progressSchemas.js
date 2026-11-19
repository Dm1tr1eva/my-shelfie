const { z } = require("zod");
const { objectId } = require("./objectId");
const { BOOK_LENGTH_MAX } = require("../constants/library");

const createProgressSchema = z
  .object({
    bookId: objectId,
    page: z.number().int().min(0).max(BOOK_LENGTH_MAX).optional(),
    percent: z.number().int().min(0).max(100).optional(),
  })
  .strict()
  .refine((data) => (data.page === undefined) !== (data.percent === undefined), {
    message: "Send either page or percent",
  });

module.exports = { createProgressSchema };
