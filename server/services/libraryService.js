const bookRepository = require("../repositories/bookRepository");
const seriesService = require("./seriesService");
const { toBookDto } = require("../dto/bookDto");
const { toSeriesDto } = require("../dto/seriesDto");
const { pickNextToBuy } = require("./nextToBuy");
const { buildWishlist } = require("./wishlist");

async function loadShelf(userId) {
  const [books, series] = await Promise.all([
    bookRepository.findForNextToBuy(userId),
    seriesService.listDocs(userId),
  ]);
  const byId = new Map(series.map((item) => [String(item._id), item]));

  return {
    series: series.map((item) => toSeriesDto(item)),
    books: books.map((book) => toBookDto(book, byId.get(String(book.seriesId)))),
  };
}

async function nextToBuy(userId, filters) {
  return pickNextToBuy({ ...(await loadShelf(userId)), filters });
}

async function wishlist(userId) {
  return buildWishlist(await loadShelf(userId));
}

async function listTropes(userId) {
  const [bookTropes, series] = await Promise.all([
    bookRepository.findTropesForUser(userId),
    seriesService.listDocs(userId),
  ]);
  const tropes = new Set([...bookTropes, ...series.flatMap((item) => item.tropes ?? [])]);
  return [...tropes].sort((a, b) => a.localeCompare(b));
}

module.exports = { nextToBuy, wishlist, listTropes };
