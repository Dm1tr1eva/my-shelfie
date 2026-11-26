const bookRepository = require("../repositories/bookRepository");
const seriesRepository = require("../repositories/seriesRepository");
const { inTransaction } = require("../repositories/transaction");
const { GENRES_MAX, TROPES_MAX } = require("../constants/library");
const { HttpError } = require("../errors/httpError");

const NO_COUNTS = { owned: 0, wanted: 0 };

function byNumberThenAge(a, b) {
  const aNumber = a.seriesNumber ?? Infinity;
  const bNumber = b.seriesNumber ?? Infinity;
  if (aNumber !== bNumber) return aNumber - bNumber;
  return a.createdAt - b.createdAt;
}

function union(...lists) {
  return [...new Set(lists.flat())];
}

async function ensureTags(userId, docs) {
  for (const doc of docs.filter((item) => !item.tagsMerged)) {
    const books = await bookRepository.findBySeries(userId, doc._id);

    doc.genres = union(doc.genres ?? [], ...books.map((book) => book.genres ?? []));
    doc.tropes = union(doc.tropes ?? [], ...books.map((book) => book.tropes ?? []));
    if (!doc.annotation) {
      doc.annotation = books.find((book) => book.annotation)?.annotation;
    }
    doc.tagsMerged = true;
    await doc.save();
  }

  return docs;
}

async function listDocs(userId) {
  return ensureTags(userId, await seriesRepository.findManyForUser(userId));
}

async function absorbTags(userId, seriesId, book) {
  const series = await seriesRepository.findOneForUser(userId, seriesId);
  if (!series) return;

  await ensureTags(userId, [series]);
  series.genres = union(series.genres ?? [], book.genres ?? []);
  series.tropes = union(series.tropes ?? [], book.tropes ?? []);
  if (!series.annotation && book.annotation) series.annotation = book.annotation;
  await series.save();
}

async function createSeries(userId, data) {
  return seriesRepository.create(userId, { ...data, tagsMerged: true });
}

async function listSeries(userId) {
  const series = await listDocs(userId);
  const counts = await bookRepository.countBySeries(
    userId,
    series.map((item) => item._id),
  );

  return series.map((item) => ({
    series: item,
    counts: counts.get(String(item._id)) ?? NO_COUNTS,
  }));
}

async function getSeries(userId, id) {
  const series = await seriesRepository.findOneForUser(userId, id);
  if (!series) return null;
  await ensureTags(userId, [series]);

  const books = await bookRepository.findBySeries(userId, id);
  const counts = { owned: 0, wanted: 0 };
  for (const book of books) {
    counts[book.ownership === "wanted" ? "wanted" : "owned"] += 1;
  }

  return { series, counts, books: [...books].sort(byNumberThenAge) };
}

async function updateSeries(userId, id, updates) {
  return seriesRepository.updateOneForUser(userId, id, updates);
}

function mergeTags(first, second, max) {
  const seen = new Set();
  const merged = [];

  for (const tag of [...first, ...second]) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(tag);
  }

  return merged.slice(0, max);
}

async function deleteSeries(userId, id) {
  return inTransaction(async (session) => {
    const series = await seriesRepository.deleteOneForUser(userId, id, session);
    if (!series) return null;

    const books = await bookRepository.findTagsBySeries(userId, id, session);
    const tagsByBook = books.map((book) => ({
      id: book._id,
      genres: mergeTags(series.genres ?? [], book.genres ?? [], GENRES_MAX),
      tropes: mergeTags(series.tropes ?? [], book.tropes ?? [], TROPES_MAX),
    }));

    await bookRepository.leaveSeries(userId, id, tagsByBook, session);
    return series;
  });
}

async function assertSeriesExists(userId, id) {
  const series = await seriesRepository.findOneForUser(userId, id);
  if (!series) throw new HttpError(400, "seriesId: unknown series");
}

module.exports = {
  createSeries,
  listSeries,
  getSeries,
  updateSeries,
  deleteSeries,
  assertSeriesExists,
  listDocs,
  absorbTags,
};
