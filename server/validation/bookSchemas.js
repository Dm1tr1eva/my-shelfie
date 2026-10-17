const { z } = require("zod");
const { OWNERSHIP, FORMATS, LINK_LANGUAGES, GENRES } = require("../constants/library");
const { SEARCH_MAX_START_INDEX } = require("../constants/search");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Not a valid id");

const linkSchema = z
  .object({
    language: z.enum(LINK_LANGUAGES),
    url: z.httpUrl(),
  })
  .strict();

const baseBookSchema = z
  .object({
    title: z.string().min(1),
    author: z.string().min(1),
    coverUrl: z.string().optional(),
    googleVolumeId: z.string().min(1).optional(),
    description: z.string().optional(),
    ownership: z.enum(OWNERSHIP).optional(),
    format: z.enum(FORMATS).optional(),
    seriesId: objectId.optional(),
    seriesNumber: z.number().positive().optional(),
    genres: z
      .array(z.enum(GENRES))
      .max(GENRES.length)
      .refine((genres) => new Set(genres).size === genres.length, "Genres must be unique")
      .optional(),
    tropes: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    links: z.array(linkSchema).max(10).optional(),
    notes: z.string().max(5000).optional(),
    annotation: z.string().max(5000).optional(),
    status: z.enum(["want", "reading", "dropped", "read"]).optional(),
    rating: z.number().min(1).max(5).optional(),
    review: z.string().optional(),
    startedAt: z.coerce.date().optional(),
    finishedAt: z.coerce.date().optional(),
  })
  .strict();

const createBookSchema = baseBookSchema.refine(
  (data) => data.seriesNumber === undefined || data.seriesId !== undefined,
  { message: "seriesNumber needs a seriesId", path: ["seriesNumber"] },
);

const CLEARABLE_FIELDS = [
  "coverUrl",
  "description",
  "seriesId",
  "seriesNumber",
  "notes",
  "annotation",
  "rating",
  "review",
  "startedAt",
  "finishedAt",
];

const clearableFields = Object.fromEntries(
  CLEARABLE_FIELDS.map((field) => [field, baseBookSchema.shape[field].nullable()]),
);

const updateBookSchema = baseBookSchema
  .partial()
  .extend(clearableFields)
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "No updatable fields provided",
  });

const searchBooksQuerySchema = z
  .object({
    q: z.string().trim().min(3).max(200),
    startIndex: z.coerce.number().int().min(0).max(SEARCH_MAX_START_INDEX).optional(),
  })
  .strict();

const listBooksFiltersSchema = z.object({
  ownership: z.enum(OWNERSHIP).optional(),
  seriesId: objectId.optional(),
  genre: z.enum(GENRES).optional(),
  trope: z.string().trim().min(1).max(60).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

module.exports = {
  createBookSchema,
  updateBookSchema,
  searchBooksQuerySchema,
  listBooksFiltersSchema,
};
