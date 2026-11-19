const express = require("express");
const progressController = require("../controllers/progressController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, progressController.recordProgress);
router.get("/", requireAuth, progressController.listLatest);

module.exports = router;
