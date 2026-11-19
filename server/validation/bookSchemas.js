const { z } = require("zod");
const {
  OWNERSHIP,
  FORMATS,
  LINK_KINDS,
  LINK_LANGUAGES,
  DESIRE_LEVELS,
  AGE_RATINGS,
  RECOMMEND,
} = require("../constants/library");
const { genreList, genreName } = require("./genre");
const { uniqueTextList } = require("./textList");
const { objectId } = require("./objectId");
const { SEARCH_MAX_START_INDEX } = require("../constants/search");

const wholeCount = z.number().int().min(1).max(10000);

const moodList = uniqueTextList(z.string().trim().min(1).max(40), 12, "Moods must be unique");

const quoteSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    page: wholeCount.optional(),
  })
  .strict();

const linkSchema = z
  .object({
    kind: z.enum(LINK_KINDS).optional(),
    languages: z
      .array(z.enum(LINK_LANGUAGES))
      .min(1)
      .max(LINK_LANGUAGES.length)
      .refine((languages) => new Set(languages).size === languages.length, {
        message: "Languages must be unique",
      }),
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
    pages: wholeCount.optional(),
    durationMinutes: wholeCount.optional(),
    seriesId: objectId.optional(),
    seriesNumber: z.number().positive().optional(),
    genres: genreList.optional(),
    tropes: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    links: z.array(linkSchema).max(10).optional(),
    notes: z.string().max(5000).optional(),
    annotation: z.string().max(5000).optional(),
    status: z.enum(["want", "reading", "dropped", "read"]).optional(),
    rating: z.number().min(1).max(5).optional(),
    moods: moodList.optional(),
    recommend: z.enum(RECOMMEND).optional(),
    quotes: z.array(quoteSchema).max(50).optional(),
    desire: z.enum(DESIRE_LEVELS).optional(),
    ageRating: z.enum(AGE_RATINGS).optional(),
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
  "pages",
  "durationMinutes",
  "recommend",
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
  genre: genreName.optional(),
  trope: z.string().trim().min(1).max(60).optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

module.exports = {
  createBookSchema,
  updateBookSchema,
  searchBooksQuerySchema,
  listBooksFiltersSchema,
};
