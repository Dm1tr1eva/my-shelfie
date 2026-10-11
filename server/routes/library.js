const express = require("express");
const libraryController = require("../controllers/libraryController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/next-to-buy", requireAuth, libraryController.nextToBuy);
router.get("/tropes", requireAuth, libraryController.listTropes);

module.exports = router;
