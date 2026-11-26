const mongoose = require("mongoose");
const ProgressEntry = require("../models/progressEntry");

async function create(userId, data) {
  return ProgressEntry.create({ ...data, userId });
}

async function findLatestPerBook(userId) {
  return ProgressEntry.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)) } },
    { $sort: { bookId: 1, date: -1, _id: -1 } },
    { $group: { _id: "$bookId", entry: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$entry" } },
    { $sort: { date: -1, _id: -1 } },
  ]);
}

async function findAllForUser(userId) {
  return ProgressEntry.find({ userId }).sort({ date: 1, _id: 1 });
}

async function deleteForBook(userId, bookId) {
  await ProgressEntry.deleteMany({ userId, bookId });
}

module.exports = { create, findLatestPerBook, findAllForUser, deleteForBook };
