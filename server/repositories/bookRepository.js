const mongoose = require("mongoose");
const Book = require("../models/book");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(text) {
  return text.replace(REGEX_SPECIAL_CHARACTERS, (character) => `\\${character}`);
}

function buildFilter(userId, { status, ownership, seriesId, genre, trope, q } = {}) {
  const filter = { userId };

  if (status) filter.status = status;
  if (ownership === "wanted") filter.ownership = "wanted";
  if (ownership === "owned") filter.ownership = { $ne: "wanted" };
  if (seriesId) filter.seriesId = seriesId;
  if (genre) filter.genres = genre;
  if (trope) filter.tropes = trope;

  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: pattern }, { author: pattern }];
  }

  return filter;
}

async function create(userId, data) {
  return Book.create({ ...data, userId });
}

async function findManyForUser(userId, { page, limit, ...filters } = {}) {
  const filter = buildFilter(userId, filters);

  const books = await Book.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Book.countDocuments(filter);

  return { books, total };
}

async function findOneForUser(userId, id) {
  if (!isValidId(id)) return null;
  return Book.findOne({ _id: id, userId });
}

async function updateOneForUser(userId, id, updates) {
  if (!isValidId(id)) return null;
  return Book.findOneAndUpdate({ _id: id, userId }, updates, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function deleteOneForUser(userId, id) {
  if (!isValidId(id)) return null;
  return Book.findOneAndDelete({ _id: id, userId });
}

async function findWantedForUser(userId) {
  return Book.find({ userId, ownership: "wanted" }).limit(1000);
}

async function findBySeries(userId, seriesId) {
  if (!isValidId(seriesId)) return [];
  return Book.find({ userId, seriesId }).sort({ createdAt: 1 }).limit(500);
}

async function countBySeries(userId, seriesIds) {
  const counts = new Map(seriesIds.map((id) => [String(id), { owned: 0, wanted: 0 }]));
  if (seriesIds.length === 0) return counts;

  const rows = await Book.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        seriesId: { $in: seriesIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
      },
    },
    {
      $group: {
        _id: { seriesId: "$seriesId", wanted: { $eq: ["$ownership", "wanted"] } },
        count: { $sum: 1 },
      },
    },
  ]);

  for (const row of rows) {
    const entry = counts.get(String(row._id.seriesId));
    if (entry) entry[row._id.wanted ? "wanted" : "owned"] = row.count;
  }

  return counts;
}

async function unlinkSeries(userId, seriesId) {
  if (!isValidId(seriesId)) return;
  await Book.updateMany({ userId, seriesId }, { $unset: { seriesId: "", seriesNumber: "" } });
}

async function findTropesForUser(userId) {
  return Book.distinct("tropes", { userId });
}

module.exports = {
  create,
  findManyForUser,
  findOneForUser,
  updateOneForUser,
  deleteOneForUser,
  findWantedForUser,
  findBySeries,
  countBySeries,
  unlinkSeries,
  findTropesForUser,
};
