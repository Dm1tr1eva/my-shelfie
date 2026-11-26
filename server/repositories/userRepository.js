const User = require("../models/user");

async function findById(userId) {
  return User.findById(userId);
}

async function findByEmail(email) {
  return User.findOne({ email });
}

async function create(data) {
  return User.create(data);
}

async function findYearGoal(userId) {
  const user = await User.findById(userId, { yearGoal: 1 });
  return user?.yearGoal ?? null;
}

async function setYearGoal(userId, yearGoal) {
  const user = await User.findByIdAndUpdate(
    userId,
    { yearGoal },
    { returnDocument: "after", runValidators: true, projection: { yearGoal: 1 } },
  );
  return user?.yearGoal ?? null;
}

module.exports = { findById, findByEmail, create, findYearGoal, setYearGoal };
