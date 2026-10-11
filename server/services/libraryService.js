const bookRepository = require("../repositories/bookRepository");
const seriesRepository = require("../repositories/seriesRepository");
const { toBookDto } = require("../dto/bookDto");
const { toSeriesDto } = require("../dto/seriesDto");
const { pickNextToBuy } = require("./nextToBuy");

async function nextToBuy(userId, filters) {
  const [books, series] = await Promise.all([
    bookRepository.findForNextToBuy(userId),
    seriesRepository.findManyForUser(userId),
  ]);

  return pickNextToBuy({
    series: series.map((item) => toSeriesDto(item)),
    books: books.map(toBookDto),
    filters,
  });
}

async function listTropes(userId) {
  const tropes = await bookRepository.findTropesForUser(userId);
  return tropes.sort((a, b) => a.localeCompare(b));
}

module.exports = { nextToBuy, listTropes };
