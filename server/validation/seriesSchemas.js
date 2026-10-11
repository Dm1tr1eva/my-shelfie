const { z } = require("zod");
const { SERIES_STATUSES } = require("../constants/library");

const baseSeriesSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    author: z.string().trim().min(1).max(200).optional(),
    status: z.enum(SERIES_STATUSES).optional(),
    note: z.string().max(2000).optional(),
    priority: z.boolean().optional(),
  })
  .strict();

const createSeriesSchema = baseSeriesSchema;

const updateSeriesSchema = baseSeriesSchema
  .partial()
  .extend({
    author: baseSeriesSchema.shape.author.nullable(),
    note: baseSeriesSchema.shape.note.nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No updatable fields provided",
  });

module.exports = { createSeriesSchema, updateSeriesSchema };
