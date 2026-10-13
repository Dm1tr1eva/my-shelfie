const bookRepository = require("../repositories/bookRepository");
const seriesService = require("./seriesService");

class SeriesNumberWithoutSeriesError extends Error {
  constructor() {
    super("seriesNumber needs a seriesId");
    this.name = "SeriesNumberWithoutSeriesError";
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

async function createBook(userId, data) {
  if (data.seriesId) {
    await seriesService.assertSeriesExists(userId, data.seriesId);
  }

  const book = await bookRepository.create(userId, data);

  if (data.seriesId) {
    await seriesService.absorbTags(userId, data.seriesId, book);
  }

  return book;
}

async function seriesMapFor(userId, books) {
  const wanted = new Set(
    books.filter((book) => book.seriesId).map((book) => String(book.seriesId)),
  );
  if (wanted.size === 0) return new Map();

  const docs = await seriesService.listDocs(userId);
  return new Map(
    docs.filter((doc) => wanted.has(String(doc._id))).map((doc) => [String(doc._id), doc]),
  );
}

async function listBooks(userId, { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, ...filters } = {}) {
  const { books, total } = await bookRepository.findManyForUser(userId, {
    ...filters,
    page,
    limit,
  });
  return { books, total, page, limit };
}

async function getBook(userId, id) {
  return bookRepository.findOneForUser(userId, id);
}

async function updateBook(userId, id, updates) {
  if (typeof updates.seriesId === "string") {
    await seriesService.assertSeriesExists(userId, updates.seriesId);
  }

  const changes = { ...updates };
  const touchesSeries = updates.seriesId !== undefined || typeof updates.seriesNumber === "number";

  if (touchesSeries) {
    const current = await bookRepository.findOneForUser(userId, id);
    if (!current) return null;

    const seriesId = updates.seriesId === undefined ? current.seriesId : updates.seriesId;

    if (!seriesId) {
      if (typeof updates.seriesNumber === "number") {
        throw new SeriesNumberWithoutSeriesError();
      }
      changes.seriesNumber = null;
    }
  }

  const updated = await bookRepository.updateOneForUser(userId, id, changes);

  if (updated && typeof updates.seriesId === "string") {
    await seriesService.absorbTags(userId, updates.seriesId, updated);
  }

  return updated;
}

async function deleteBook(userId, id) {
  return bookRepository.deleteOneForUser(userId, id);
}

module.exports = {
  createBook,
  listBooks,
  getBook,
  updateBook,
  deleteBook,
  SeriesNumberWithoutSeriesError,
  seriesMapFor,
};
