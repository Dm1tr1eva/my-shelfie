const bookRepository = require("../repositories/bookRepository");
const seriesRepository = require("../repositories/seriesRepository");

class SeriesNotFoundError extends Error {
  constructor() {
    super("Unknown series");
    this.name = "SeriesNotFoundError";
  }
}

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

async function deleteSeries(userId, id) {
  const series = await seriesRepository.deleteOneForUser(userId, id);
  if (series) {
    await bookRepository.unlinkSeries(userId, id);
  }
  return series;
}

async function assertSeriesExists(userId, id) {
  const series = await seriesRepository.findOneForUser(userId, id);
  if (!series) throw new SeriesNotFoundError();
}

module.exports = {
  SeriesNotFoundError,
  createSeries,
  listSeries,
  getSeries,
  updateSeries,
  deleteSeries,
  assertSeriesExists,
  listDocs,
  absorbTags,
};
