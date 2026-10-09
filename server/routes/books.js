const express = require("express");
const bookController = require("../controllers/bookController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, bookController.createBook);
router.get("/", requireAuth, bookController.getBooks);
router.get("/search", requireAuth, bookController.searchBooks);
router.get("/:id", requireAuth, bookController.getBook);
router.patch("/:id", requireAuth, bookController.updateBook);
router.delete("/:id", requireAuth, bookController.deleteBook);

module.exports = router;
