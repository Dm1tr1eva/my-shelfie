const yearGoalService = require("../services/yearGoalService");
const { yearGoalSchema } = require("../validation/yearGoalSchemas");
const { validate } = require("../validation/validate");
const { toYearGoalDto } = require("../dto/yearGoalDto");

async function getYearGoal(req, res) {
  const yearGoal = await yearGoalService.getYearGoal(req.userId);
  res.json({ yearGoal: toYearGoalDto(yearGoal) });
}

async function setYearGoal(req, res) {
  const goal = validate(yearGoalSchema, req.body);

  const yearGoal = await yearGoalService.setYearGoal(req.userId, goal);

  if (!yearGoal) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ yearGoal: toYearGoalDto(yearGoal) });
}

module.exports = { getYearGoal, setYearGoal };
