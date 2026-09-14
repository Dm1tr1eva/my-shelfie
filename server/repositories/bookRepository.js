const mongoose = require("mongoose");
const Book = require("../models/book");

// Every method takes userId first and folds it into the query itself, never
// as a separate check after the fact — the multi-tenancy rule this repo's
// CLAUDE.md sets: a resource in another tenant must be indistinguishable
// from one that does not exist at all.

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function create(userId, data) {
  return Book.create({ ...data, userId });
}

async function findManyForUser(userId, { status, page, limit } = {}) {
  const filter = { userId };
  if (status) filter.status = status;

  const books = await Book.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Book.countDocuments(filter);

  return { books, total };
}

// Returns null both when the id is not a valid ObjectId and when no
// matching document exists for this user — callers treat both the same way
// (404), so the repository absorbs the Mongoose-specific CastError here
// instead of letting it escape as an exception a caller has to know about.
async function findOneForUser(userId, id) {
  if (!isValidId(id)) return null;
  return Book.findOne({ _id: id, userId });
}

async function updateOneForUser(userId, id, updates) {
  if (!isValidId(id)) return null;
  return Book.findOneAndUpdate(
    { _id: id, userId },
    updates,
    { returnDocument: "after", runValidators: true },
  );
}

async function deleteOneForUser(userId, id) {
  if (!isValidId(id)) return null;
  return Book.findOneAndDelete({ _id: id, userId });
}

module.exports = {
  create,
  findManyForUser,
  findOneForUser,
  updateOneForUser,
  deleteOneForUser,
};
