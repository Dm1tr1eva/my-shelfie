const User = require("../models/user");

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

module.exports = { findYearGoal, setYearGoal };
