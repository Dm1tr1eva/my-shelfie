const express = require("express");
const bookController = require("../controllers/bookController");
const { requireAuth } = require("../middleware/auth");
const { failsWith } = require("../middleware/errors");

const router = express.Router();

router.post("/", requireAuth, failsWith("Failed to create book"), bookController.createBook);
router.get("/", requireAuth, failsWith("Failed to fetch books"), bookController.getBooks);
router.get("/search", requireAuth, failsWith("Failed to search books"), bookController.searchBooks);
router.get("/:id", requireAuth, failsWith("Failed to fetch book"), bookController.getBook);
router.patch("/:id", requireAuth, failsWith("Failed to update book"), bookController.updateBook);
router.delete("/:id", requireAuth, failsWith("Failed to delete book"), bookController.deleteBook);

module.exports = router;
