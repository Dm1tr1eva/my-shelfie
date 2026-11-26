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

const DUPLICATE_KEY = 11000;

async function saveSeriesUnlessFresh(seriesKey, data, now) {
  try {
    return await SeriesLookup.findOneAndUpdate(
      { seriesKey, expiresAt: { $lte: now } },
      { $set: { ...data, seriesKey } },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).lean();
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
  }

  return SeriesLookup.findOne({ seriesKey }).lean();
}

async function saveBook(bookKey, data) {
  await SeriesLookupBook.updateOne(
    { bookKey },
    { $set: { ...data, bookKey } },
    { upsert: true, runValidators: true },
  );
}

module.exports = {
  findBook,
  findSeriesById,
  findSeriesByTitle,
  saveSeriesUnlessFresh,
  saveBook,
};
