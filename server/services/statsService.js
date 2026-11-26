const bookRepository = require("../repositories/bookRepository");
const progressRepository = require("../repositories/progressRepository");
const seriesService = require("./seriesService");
const yearGoalService = require("./yearGoalService");
const { toBookDto } = require("../dto/bookDto");
const { toSeriesDto } = require("../dto/seriesDto");
const { buildHomeStats } = require("./homeStats");

async function homeStats(userId, { year, now }) {
  const [books, series, entries, goal] = await Promise.all([
    bookRepository.findAllForUser(userId),
    seriesService.listDocs(userId),
    progressRepository.findAllForUser(userId),
    yearGoalService.getYearGoal(userId),
  ]);
  const seriesById = new Map(series.map((item) => [String(item._id), item]));

  return buildHomeStats({
    year,
    now,
    books: books.map((book) => toBookDto(book, seriesById.get(String(book.seriesId)))),
    series: series.map((item) => toSeriesDto(item)),
    entries,
    goal,
  });
}

module.exports = { homeStats };
