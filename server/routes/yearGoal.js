const express = require("express");
const yearGoalController = require("../controllers/yearGoalController");
const { requireAuth } = require("../middleware/auth");
const { failsWith } = require("../middleware/errors");

const router = express.Router();

router.get("/", requireAuth, failsWith("Failed to fetch the goal"), yearGoalController.getYearGoal);
router.put("/", requireAuth, failsWith("Failed to save the goal"), yearGoalController.setYearGoal);

module.exports = router;
