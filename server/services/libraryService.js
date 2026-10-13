const bookRepository = require("../repositories/bookRepository");
const seriesService = require("./seriesService");
const { toBookDto } = require("../dto/bookDto");
const { toSeriesDto } = require("../dto/seriesDto");
const { pickNextToBuy } = require("./nextToBuy");

async function nextToBuy(userId, filters) {
  const [books, series] = await Promise.all([
    bookRepository.findForNextToBuy(userId),
    seriesService.listDocs(userId),
  ]);
  const byId = new Map(series.map((item) => [String(item._id), item]));

  return pickNextToBuy({
    series: series.map((item) => toSeriesDto(item)),
    books: books.map((book) => toBookDto(book, byId.get(String(book.seriesId)))),
    filters,
  });
}

async function listTropes(userId) {
  const [bookTropes, series] = await Promise.all([
    bookRepository.findTropesForUser(userId),
    seriesService.listDocs(userId),
  ]);
  const tropes = new Set([...bookTropes, ...series.flatMap((item) => item.tropes ?? [])]);
  return [...tropes].sort((a, b) => a.localeCompare(b));
}

module.exports = { nextToBuy, listTropes };
