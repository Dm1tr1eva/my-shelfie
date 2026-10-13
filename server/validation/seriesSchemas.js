const { z } = require("zod");
const { SERIES_STATUSES, GENRES } = require("../constants/library");

const baseSeriesSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    author: z.string().trim().min(1).max(200).optional(),
    status: z.enum(SERIES_STATUSES).optional(),
    note: z.string().max(2000).optional(),
    totalBooks: z.number().int().min(1).max(200).optional(),
    genres: z
      .array(z.enum(GENRES))
      .max(GENRES.length)
      .refine((genres) => new Set(genres).size === genres.length, "Genres must be unique")
      .optional(),
    tropes: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    annotation: z.string().max(5000).optional(),
  })
  .strict();

const createSeriesSchema = baseSeriesSchema;

const updateSeriesSchema = baseSeriesSchema
  .partial()
  .extend({
    author: baseSeriesSchema.shape.author.nullable(),
    note: baseSeriesSchema.shape.note.nullable(),
    totalBooks: baseSeriesSchema.shape.totalBooks.nullable(),
    annotation: baseSeriesSchema.shape.annotation.nullable(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No updatable fields provided",
  });

module.exports = { createSeriesSchema, updateSeriesSchema };
