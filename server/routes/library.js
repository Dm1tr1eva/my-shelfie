const express = require("express");
const libraryController = require("../controllers/libraryController");
const { requireAuth } = require("../middleware/auth");
const { failsWith } = require("../middleware/errors");

const router = express.Router();

router.get(
  "/wishlist",
  requireAuth,
  failsWith("Failed to build the list"),
  libraryController.wishlist,
);
router.get(
  "/tropes",
  requireAuth,
  failsWith("Failed to fetch tropes"),
  libraryController.listTropes,
);

module.exports = router;
