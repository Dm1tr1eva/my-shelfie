const bookRepository = require("../repositories/bookRepository");
const progressRepository = require("../repositories/progressRepository");
const bookService = require("./bookService");
const { HttpError } = require("../errors/httpError");
const { pageAtPercent } = require("./readingPosition");

function positionOf(book, { page, percent }) {
  if (page === undefined) {
    return book.pages ? { page: pageAtPercent(percent, book.pages), percent } : { percent };
  }

  if (!book.pages) {
    throw new HttpError(400, "page: the book has no page count");
  }
  if (page > book.pages) {
    throw new HttpError(400, `page: the book has ${book.pages} pages`);
  }

  return { page, percent: Math.floor((page * 100) / book.pages) };
}

function startsReading(book) {
  return book.status === "want" && book.ownership !== "wanted";
}

async function recordProgress(userId, { bookId, ...position }) {
  const book = await bookRepository.findOneForUser(userId, bookId);
  if (!book) return null;

  const entry = await progressRepository.create(userId, { bookId, ...positionOf(book, position) });

  if (startsReading(book)) {
    await bookService.updateBook(userId, bookId, { status: "reading" });
  }

  return entry;
}

async function listLatest(userId) {
  return progressRepository.findLatestPerBook(userId);
}

module.exports = { recordProgress, listLatest };
