const bookService = require("../services/bookService");
const { createBookSchema, updateBookSchema } = require("../validation/bookSchemas");
const { toBookDto } = require("../dto/bookDto");

function formatZodError(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

async function createBook(req, res) {
  const parsed = createBookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  try {
    const book = await bookService.createBook(req.userId, parsed.data);
    res.status(201).json(toBookDto(book));
  } catch (err) {
    res.status(500).json({ error: "Failed to create book" });
  }
}

async function getBooks(req, res) {
  try {
    const { status } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const { books, total } = await bookService.listBooks(req.userId, { status, page, limit });

    res.json({ books: books.map(toBookDto), total, page, limit });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
}

async function getBook(req, res) {
  try {
    const book = await bookService.getBook(req.userId, req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(toBookDto(book));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch book" });
  }
}

async function updateBook(req, res) {
  const parsed = updateBookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  try {
    const book = await bookService.updateBook(req.userId, req.params.id, parsed.data);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(toBookDto(book));
  } catch (err) {
    res.status(500).json({ error: "Failed to update book" });
  }
}

async function deleteBook(req, res) {
  try {
    const book = await bookService.deleteBook(req.userId, req.params.id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete book" });
  }
}

module.exports = { createBook, getBooks, getBook, updateBook, deleteBook };
