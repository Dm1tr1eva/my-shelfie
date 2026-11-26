const SeriesLookup = require("../models/seriesLookup");
const SeriesLookupBook = require("../models/seriesLookupBook");

async function findBook(bookKey, now) {
  return SeriesLookupBook.findOne({ bookKey, expiresAt: { $gt: now } }).lean();
}

async function findSeriesById(seriesLookupId, now) {
  return SeriesLookup.findOne({ _id: seriesLookupId, expiresAt: { $gt: now } }).lean();
}

async function findSeriesByTitle(titleKey, authorKeys, now) {
  return SeriesLookup.findOne({
    titleKeys: titleKey,
    authorKeys: { $in: authorKeys },
    expiresAt: { $gt: now },
  })
    .sort({ updatedAt: -1 })
    .lean();
}

async function saveSeries(seriesKey, data) {
  return SeriesLookup.findOneAndUpdate(
    { seriesKey },
    { $set: { ...data, seriesKey } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
}

async function saveBook(bookKey, data) {
  await SeriesLookupBook.updateOne(
    { bookKey },
    { $set: { ...data, bookKey } },
    { upsert: true, runValidators: true },
  );
}

module.exports = { findBook, findSeriesById, findSeriesByTitle, saveSeries, saveBook };
