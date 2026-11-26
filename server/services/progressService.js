const bookRepository = require("../repositories/bookRepository");
const progressRepository = require("../repositories/progressRepository");
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

async function recordProgress(userId, { bookId, ...position }) {
  const book = await bookRepository.findOneForUser(userId, bookId);
  if (!book) return null;

  return progressRepository.create(userId, { bookId, ...positionOf(book, position) });
}

async function listLatest(userId) {
  return progressRepository.findLatestPerBook(userId);
}

module.exports = { recordProgress, listLatest };
