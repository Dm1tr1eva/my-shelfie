const bookRepository = require("../repositories/bookRepository");
const progressRepository = require("../repositories/progressRepository");
const seriesService = require("./seriesService");
const { HttpError } = require("../errors/httpError");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const DATE_SET_BY_STATUS = { reading: "startedAt", read: "finishedAt" };

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function datesForEnteredStatus(request, current) {
  const field = DATE_SET_BY_STATUS[request.status];
  if (!field || request.status === current?.status) return {};
  if (request[field] !== undefined || current?.[field]) return {};
  return { [field]: startOfTodayUtc() };
}

async function createBook(userId, data) {
  if (data.seriesId) {
    await seriesService.assertSeriesExists(userId, data.seriesId);
  }

  const book = await bookRepository.create(userId, {
    ...data,
    ...datesForEnteredStatus(data, null),
  });

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
  if (updates.notes !== undefined) {
    changes.review = null;
  }

  const touchesSeries = updates.seriesId !== undefined || typeof updates.seriesNumber === "number";

  if (touchesSeries || updates.status !== undefined) {
    const current = await bookRepository.findOneForUser(userId, id);
    if (!current) return null;

    Object.assign(changes, datesForEnteredStatus(updates, current));

    const seriesId = updates.seriesId === undefined ? current.seriesId : updates.seriesId;

    if (touchesSeries && !seriesId) {
      if (typeof updates.seriesNumber === "number") {
        throw new HttpError(400, "seriesNumber: needs a seriesId");
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
  const book = await bookRepository.deleteOneForUser(userId, id);
  if (book) {
    await progressRepository.deleteForBook(userId, book._id);
  }
  return book;
}

module.exports = {
  createBook,
  listBooks,
  getBook,
  updateBook,
  deleteBook,
  seriesMapFor,
};
