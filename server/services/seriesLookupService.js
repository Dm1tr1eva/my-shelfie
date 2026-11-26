const crypto = require("node:crypto");

const seriesLookupRepository = require("../repositories/seriesLookupRepository");
const seriesLookupUsageRepository = require("../repositories/seriesLookupUsageRepository");
const seriesLookupProvider = require("./seriesLookup/provider");
const { readSeriesLookupConfig } = require("../config/seriesLookup");
const { HttpError } = require("../errors/httpError");

const DAY_MS = 24 * 60 * 60 * 1000;
const UNSETTLED_TTL_DAYS = 30;
const SETTLED_TTL_DAYS = 180;
const USAGE_TTL_DAYS = 2;

function normalizeText(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[’ʼ`´]/g, "'")
    .replace(/[«»"“”„]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function authorKeysOf(authors) {
  return [...new Set(authors.map(normalizeText))].sort();
}

function bookKeyOf(query) {
  const parts = [
    normalizeText(query.title),
    authorKeysOf(query.authors),
    normalizeText(query.subtitle ?? ""),
    query.isbn ?? "",
    query.googleVolumeId ?? "",
    query.language ?? "",
  ];
  return crypto.createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function daysFrom(now, days) {
  return new Date(now.getTime() + days * DAY_MS);
}

function isSettled(answer) {
  return answer.status === "complete" && answer.books.every((book) => book.released);
}

function seriesResult(series, number, confidence) {
  return { result: "series", series, number, confidence, sources: series.sources };
}

function standaloneResult(book) {
  return { result: "standalone", confidence: book.confidence, sources: book.sources };
}

async function fromCache(bookKey, query, now) {
  const book = await seriesLookupRepository.findBook(bookKey, now);
  if (book && !book.seriesLookupId) return standaloneResult(book);
  if (book) {
    const series = await seriesLookupRepository.findSeriesById(book.seriesLookupId, now);
    if (series) return seriesResult(series, book.number, book.confidence);
  }

  const titleKey = normalizeText(query.title);
  const series = await seriesLookupRepository.findSeriesByTitle(
    titleKey,
    authorKeysOf(query.authors),
    now,
  );
  if (!series) return null;

  const listed = series.books.find((entry) => normalizeText(entry.title) === titleKey);
  return seriesResult(series, listed?.number ?? null, series.confidence);
}

async function store(bookKey, query, answer, now) {
  const bookFields = {
    title: query.title,
    authors: query.authors,
    confidence: answer.confidence,
    sources: answer.sources,
  };

  if (answer.series === null) {
    const expiresAt = daysFrom(now, UNSETTLED_TTL_DAYS);
    await seriesLookupRepository.saveBook(bookKey, {
      ...bookFields,
      seriesLookupId: null,
      number: null,
      expiresAt,
    });
    return standaloneResult(bookFields);
  }

  const authorKeys = authorKeysOf(query.authors);
  const names = [answer.series, answer.seriesOriginal].filter(Boolean);
  const titleKeys = [
    ...new Set(
      [query.title, ...names, ...answer.books.map((book) => book.title)].map(normalizeText),
    ),
  ];
  const expiresAt = daysFrom(now, isSettled(answer) ? SETTLED_TTL_DAYS : UNSETTLED_TTL_DAYS);
  const seriesKey = `${normalizeText(answer.seriesOriginal ?? answer.series)}|${authorKeys.join(",")}`;

  const series = await seriesLookupRepository.saveSeries(seriesKey, {
    name: answer.series,
    originalName: answer.seriesOriginal,
    status: answer.status,
    books: answer.books,
    confidence: answer.confidence,
    sources: answer.sources,
    titleKeys,
    authorKeys,
    expiresAt,
  });
  await seriesLookupRepository.saveBook(bookKey, {
    ...bookFields,
    seriesLookupId: series._id,
    number: answer.number,
    expiresAt,
  });

  return seriesResult(series, answer.number, answer.confidence);
}

function logModelCall(provider, model, outcome) {
  const result = outcome.answer
    ? outcome.answer.series === null
      ? "standalone"
      : "series"
    : `unknown:${outcome.reason}`;
  console.log(
    "series_lookup.model_call",
    JSON.stringify({ provider, model, result, ...outcome.usage }),
  );
}

async function lookUpSeries(userId, query, now = new Date()) {
  const bookKey = bookKeyOf(query);

  const cached = await fromCache(bookKey, query, now);
  if (cached) return cached;

  const { provider, model, dailyLimit } = readSeriesLookupConfig();
  const day = now.toISOString().slice(0, 10);
  const allowed = await seriesLookupUsageRepository.reserve(
    userId,
    day,
    dailyLimit,
    daysFrom(now, USAGE_TTL_DAYS),
  );
  if (!allowed) throw new HttpError(429, "Daily series lookup limit reached");

  const outcome = await seriesLookupProvider.lookUpSeries(query);
  logModelCall(provider, model, outcome);

  if (!outcome.answer) return { result: "unknown" };
  return store(bookKey, query, outcome.answer, now);
}

module.exports = { lookUpSeries };
