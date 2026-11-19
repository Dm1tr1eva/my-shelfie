const mongoose = require("mongoose");
const User = require("../models/user");

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function findYearGoal(userId) {
  if (!isValidId(userId)) return null;
  const user = await User.findById(userId, { yearGoal: 1 });
  return user?.yearGoal ?? null;
}

async function setYearGoal(userId, yearGoal) {
  if (!isValidId(userId)) return null;
  const user = await User.findByIdAndUpdate(
    userId,
    { yearGoal },
    { returnDocument: "after", runValidators: true, projection: { yearGoal: 1 } },
  );
  return user?.yearGoal ?? null;
}

module.exports = { findYearGoal, setYearGoal };
