const mongoose = require("mongoose");
const Book = require("../models/book");

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

module.exports = {
  create,
  findManyForUser,
  findOneForUser,
  updateOneForUser,
  deleteOneForUser,
};
