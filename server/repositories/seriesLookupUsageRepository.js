const SeriesLookupUsage = require("../models/seriesLookupUsage");

const DUPLICATE_KEY = 11000;

async function reserve(userId, day, limit, expiresAt) {
  if (limit <= 0) return false;

  const underLimit = { userId, day, count: { $lt: limit } };

  try {
    await SeriesLookupUsage.updateOne(
      underLimit,
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true },
    );
    return true;
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
  }

  const { modifiedCount } = await SeriesLookupUsage.updateOne(underLimit, { $inc: { count: 1 } });
  return modifiedCount === 1;
}

module.exports = { reserve };
