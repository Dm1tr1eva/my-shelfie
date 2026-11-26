const express = require("express");
const statsController = require("../controllers/statsController");
const { requireAuth } = require("../middleware/auth");
const { failsWith } = require("../middleware/errors");

const router = express.Router();

router.get("/", requireAuth, failsWith("Failed to fetch stats"), statsController.getHomeStats);

module.exports = router;
