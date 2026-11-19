const { z } = require("zod");
const {
  SERIES_STATUSES,
  DESIRE_LEVELS,
  AGE_RATINGS,
  EXPECTED_SOURCES,
} = require("../constants/library");
const { genreList } = require("./genre");

const expectedSchema = z
  .object({
    number: z.number().positive(),
    expectedYear: z.number().int().min(1900).max(2200).optional(),
    source: z.enum(EXPECTED_SOURCES),
  })
  .strict();

const expectedList = z
  .array(expectedSchema)
  .max(50)
  .refine((entries) => new Set(entries.map((entry) => entry.number)).size === entries.length, {
    message: "Expected numbers must be unique",
  });

const baseSeriesSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    author: z.string().trim().min(1).max(200).optional(),
    status: z.enum(SERIES_STATUSES).optional(),
    note: z.string().max(2000).optional(),
    totalBooks: z.number().int().min(1).max(200).optional(),
    genres: genreList.optional(),
    tropes: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    annotation: z.string().max(5000).optional(),
    ageRating: z.enum(AGE_RATINGS).optional(),
    desire: z.enum(DESIRE_LEVELS).optional(),
    expected: expectedList.optional(),
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
