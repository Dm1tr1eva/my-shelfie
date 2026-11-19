const yearGoalService = require("../services/yearGoalService");
const { yearGoalSchema } = require("../validation/yearGoalSchemas");
const { toYearGoalDto } = require("../dto/yearGoalDto");

function formatZodError(error) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
}

async function getYearGoal(req, res) {
  try {
    const yearGoal = await yearGoalService.getYearGoal(req.userId);
    res.json({ yearGoal: toYearGoalDto(yearGoal) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch the goal" });
  }
}

async function setYearGoal(req, res) {
  const parsed = yearGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  try {
    const yearGoal = await yearGoalService.setYearGoal(req.userId, parsed.data);

    if (!yearGoal) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ yearGoal: toYearGoalDto(yearGoal) });
  } catch (err) {
    res.status(500).json({ error: "Failed to save the goal" });
  }
}

module.exports = { getYearGoal, setYearGoal };
