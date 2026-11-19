const express = require("express");
const yearGoalController = require("../controllers/yearGoalController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, yearGoalController.getYearGoal);
router.put("/", requireAuth, yearGoalController.setYearGoal);

module.exports = router;
