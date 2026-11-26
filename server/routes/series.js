const express = require("express");
const seriesController = require("../controllers/seriesController");
const seriesLookupController = require("../controllers/seriesLookupController");
const { requireAuth } = require("../middleware/auth");
const { failsWith } = require("../middleware/errors");

const router = express.Router();

router.post("/", requireAuth, failsWith("Failed to create series"), seriesController.createSeries);
router.post(
  "/lookup",
  requireAuth,
  failsWith("Failed to look up the series"),
  seriesLookupController.lookUpSeries,
);
router.get("/", requireAuth, failsWith("Failed to fetch series"), seriesController.listSeries);
router.get("/:id", requireAuth, failsWith("Failed to fetch series"), seriesController.getSeries);
router.patch(
  "/:id",
  requireAuth,
  failsWith("Failed to update series"),
  seriesController.updateSeries,
);
router.delete(
  "/:id",
  requireAuth,
  failsWith("Failed to delete series"),
  seriesController.deleteSeries,
);

module.exports = router;
