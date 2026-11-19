const express = require("express");
const progressController = require("../controllers/progressController");
const { requireAuth } = require("../middleware/auth");
const { failsWith } = require("../middleware/errors");

const router = express.Router();

router.post(
  "/",
  requireAuth,
  failsWith("Failed to save progress"),
  progressController.recordProgress,
);
router.get("/", requireAuth, failsWith("Failed to fetch progress"), progressController.listLatest);

module.exports = router;
