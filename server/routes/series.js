const express = require("express");
const seriesController = require("../controllers/seriesController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, seriesController.createSeries);
router.get("/", requireAuth, seriesController.listSeries);
router.get("/:id", requireAuth, seriesController.getSeries);
router.patch("/:id", requireAuth, seriesController.updateSeries);
router.delete("/:id", requireAuth, seriesController.deleteSeries);

module.exports = router;
