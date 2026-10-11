const mongoose = require("mongoose");
const Series = require("../models/series");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function create(userId, data) {
  return Series.create({ ...data, userId });
}

async function findManyForUser(userId) {
  return Series.find({ userId }).sort({ createdAt: -1 }).limit(1000);
}

async function findOneForUser(userId, id) {
  if (!isValidId(id)) return null;
  return Series.findOne({ _id: id, userId });
}

async function updateOneForUser(userId, id, updates) {
  if (!isValidId(id)) return null;
  return Series.findOneAndUpdate({ _id: id, userId }, updates, {
    returnDocument: "after",
    runValidators: true,
  });
}

async function deleteOneForUser(userId, id) {
  if (!isValidId(id)) return null;
  return Series.findOneAndDelete({ _id: id, userId });
}

module.exports = {
  create,
  findManyForUser,
  findOneForUser,
  updateOneForUser,
  deleteOneForUser,
};
