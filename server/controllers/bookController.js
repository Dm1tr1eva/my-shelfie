const bookService = require("../services/bookService");
const googleBooksService = require("../services/googleBooksService");
const {
  createBookSchema,
  updateBookSchema,
  searchBooksQuerySchema,
  listBooksFiltersSchema,
} = require("../validation/bookSchemas");
const { validate } = require("../validation/validate");
const { toBookDto } = require("../dto/bookDto");

async function createBook(req, res) {
  const data = validate(createBookSchema, req.body);

  const book = await bookService.createBook(req.userId, data);
  const shared = await bookService.seriesMapFor(req.userId, [book]);
  res.status(201).json(toBookDto(book, shared.get(String(book.seriesId))));
}

async function getBooks(req, res) {
  const filters = validate(listBooksFiltersSchema, req.query);

  const { status } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const { books, total } = await bookService.listBooks(req.userId, {
    ...filters,
    status,
    page,
    limit,
  });

  const shared = await bookService.seriesMapFor(req.userId, books);
  res.json({
    books: books.map((book) => toBookDto(book, shared.get(String(book.seriesId)))),
    total,
    page,
    limit,
  });
}

async function searchBooks(req, res) {
  const { q, startIndex } = validate(searchBooksQuerySchema, req.query);

  const page = await googleBooksService.searchVolumes(q, startIndex);
  res.json(page);
}

async function getBook(req, res) {
  const book = await bookService.getBook(req.userId, req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Book not found" });
  }

  const shared = await bookService.seriesMapFor(req.userId, [book]);
  res.json(toBookDto(book, shared.get(String(book.seriesId))));
}

async function updateBook(req, res) {
  const updates = validate(updateBookSchema, req.body);

  const book = await bookService.updateBook(req.userId, req.params.id, updates);

  if (!book) {
    return res.status(404).json({ error: "Book not found" });
  }

  const shared = await bookService.seriesMapFor(req.userId, [book]);
  res.json(toBookDto(book, shared.get(String(book.seriesId))));
}

async function deleteBook(req, res) {
  const book = await bookService.deleteBook(req.userId, req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Book not found" });
  }

  res.status(204).end();
}

module.exports = { createBook, getBooks, searchBooks, getBook, updateBook, deleteBook };
