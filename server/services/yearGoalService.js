const userRepository = require("../repositories/userRepository");

async function getYearGoal(userId) {
  return userRepository.findYearGoal(userId);
}

async function setYearGoal(userId, yearGoal) {
  return userRepository.setYearGoal(userId, yearGoal);
}

module.exports = { getYearGoal, setYearGoal };
