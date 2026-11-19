function toYearGoalDto(yearGoal) {
  if (!yearGoal) return null;
  return { year: yearGoal.year, books: yearGoal.books };
}

module.exports = { toYearGoalDto };
