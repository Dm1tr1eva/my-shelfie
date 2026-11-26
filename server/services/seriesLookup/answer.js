const { z } = require("zod");
const {
  LOOKUP_SERIES_STATUSES,
  LOOKUP_CONFIDENCE_LEVELS,
} = require("../../constants/seriesLookup");

const MAX_SOURCES = 5;
const MAX_BOOKS = 60;
const TITLE_MAX = 150;
const BOOK_NUMBER_MAX = 1000;

const bookNumber = z.number().positive().max(BOOK_NUMBER_MAX);

const answerBookSchema = z
  .object({
    number: bookNumber,
    title: z.string().trim().min(1).max(TITLE_MAX),
    released: z.boolean(),
    expectedYear: z.number().int().min(1900).max(2200).nullable(),
  })
  .strict();

const answerSchema = z
  .object({
    series: z.string().trim().min(1).max(TITLE_MAX).nullable(),
    seriesOriginal: z.string().trim().min(1).max(TITLE_MAX).nullable(),
    number: bookNumber.nullable(),
    books: z.array(answerBookSchema).max(MAX_BOOKS),
    status: z.enum(LOOKUP_SERIES_STATUSES),
    confidence: z.enum(LOOKUP_CONFIDENCE_LEVELS),
    sources: z.array(z.string()).max(MAX_SOURCES),
  })
  .strict()
  .refine(
    (answer) =>
      answer.series !== null ||
      (answer.seriesOriginal === null && answer.number === null && answer.books.length === 0),
    { message: "A standalone answer carries no series, number or books" },
  )
  .refine(
    (answer) => new Set(answer.books.map((book) => book.number)).size === answer.books.length,
    { message: "Book numbers must be unique" },
  );

function comparableUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch (err) {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  url.hash = "";
  return url.href.replace(/^http:/, "https:").replace(/\/$/, "");
}

function verifiedSources(sources, searchedUrls) {
  const searched = new Set([...searchedUrls].map(comparableUrl).filter(Boolean));
  const kept = [];
  for (const source of sources) {
    const comparable = comparableUrl(source);
    if (comparable && searched.has(comparable) && !kept.includes(source)) {
      kept.push(source);
    }
  }
  return kept;
}

function readJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return undefined;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    return undefined;
  }
}

function parseAnswer(text, searchedUrls) {
  const parsed = answerSchema.safeParse(readJsonObject(text));
  if (!parsed.success) return null;

  const answer = parsed.data;
  const sources = verifiedSources(answer.sources, searchedUrls);

  return {
    ...answer,
    books: [...answer.books].sort((a, b) => a.number - b.number),
    sources,
    confidence: sources.length === 0 ? "low" : answer.confidence,
  };
}

module.exports = { parseAnswer };
