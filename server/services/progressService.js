const bookRepository = require("../repositories/bookRepository");
const progressRepository = require("../repositories/progressRepository");

class ProgressPageError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProgressPageError";
  }
}

function positionOf(book, { page, percent }) {
  if (page === undefined) {
    return book.pages ? { page: Math.round((percent * book.pages) / 100), percent } : { percent };
  }

  if (!book.pages) {
    throw new ProgressPageError("page: the book has no page count");
  }
  if (page > book.pages) {
    throw new ProgressPageError(`page: the book has ${book.pages} pages`);
  }

  return { page, percent: Math.floor((page * 100) / book.pages) };
}

async function recordProgress(userId, { bookId, ...position }) {
  const book = await bookRepository.findOneForUser(userId, bookId);
  if (!book) return null;

  return progressRepository.create(userId, { bookId, ...positionOf(book, position) });
}

async function listLatest(userId) {
  return progressRepository.findLatestPerBook(userId);
}

module.exports = { recordProgress, listLatest, ProgressPageError };
