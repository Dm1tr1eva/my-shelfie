const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = 12;
const VERY_MUCH_LIMIT = 3;
const NEW_ON_SHELF_LIMIT = 6;

function yearRange(year) {
  return { from: Date.UTC(year, 0, 1), to: Date.UTC(year + 1, 0, 1) };
}

function isOwned(book) {
  return book.ownership !== "wanted";
}

function inYear(date, year) {
  return date instanceof Date && date.getUTCFullYear() === year;
}

function byNewest(a, b) {
  return b.createdAt - a.createdAt || b.id.localeCompare(a.id);
}

function seriesRef(book, seriesById) {
  const series = book.seriesId ? seriesById.get(book.seriesId) : undefined;
  if (!series) return undefined;
  return {
    id: series.id,
    title: series.title,
    ...(book.seriesNumber !== undefined && { number: book.seriesNumber }),
  };
}

function bookRef(book, seriesById) {
  const series = seriesRef(book, seriesById);
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    format: book.format,
    ...(book.coverUrl && { coverUrl: book.coverUrl }),
    ...(series && { series }),
  };
}

function readBooks(books, year) {
  return books
    .filter((book) => book.status === "read" && inYear(book.finishedAt, year))
    .sort((a, b) => a.finishedAt - b.finishedAt);
}

function readPerMonth(read, seriesById) {
  const months = Array.from({ length: MONTHS }, (_, index) => ({ month: index + 1, books: [] }));
  for (const book of read) {
    months[book.finishedAt.getUTCMonth()].books.push({
      ...bookRef(book, seriesById),
      ...(book.rating !== undefined && { rating: book.rating }),
      finishedAt: book.finishedAt,
    });
  }
  return months;
}

function pageOf(entry, pages) {
  return entry.page ?? Math.round((entry.percent * pages) / 100);
}

function pagesBetween(previous, page, pages) {
  const start = previous >= pages && page < previous ? 0 : previous;
  return Math.max(0, page - start);
}

function pagesRead(books, entries, year) {
  const counted = new Map(
    books.filter((book) => book.pages && book.format !== "audio").map((book) => [book.id, book]),
  );
  const { from, to } = yearRange(year);
  const previous = new Map();
  let total = 0;

  for (const entry of entries) {
    const bookId = String(entry.bookId);
    const book = counted.get(bookId);
    if (!book || entry.date >= to) continue;

    const page = pageOf(entry, book.pages);
    if (entry.date >= from) {
      total += pagesBetween(previous.get(bookId) ?? 0, page, book.pages);
    }
    previous.set(bookId, page);
  }

  return total;
}

function latestPerBook(entries) {
  return new Map(entries.map((entry) => [String(entry.bookId), entry]));
}

function weeksLeft(year, now) {
  const { from, to } = yearRange(year);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = Math.max(today, from);
  if (start >= to) return 0;
  return Math.ceil((to - start) / DAY_MS / 7);
}

function yearGoalFor(goal, year, done, now) {
  if (!goal || goal.year !== year) return null;
  return {
    year,
    target: goal.books,
    done,
    percent: Math.round((done * 100) / goal.books),
    weeksLeft: weeksLeft(year, now),
  };
}

function groupBySeries(books, seriesById) {
  const groups = new Map([...seriesById.keys()].map((id) => [id, []]));
  for (const book of books) {
    if (book.seriesId && groups.has(book.seriesId)) groups.get(book.seriesId).push(book);
  }
  return groups;
}

function numbersOf(books) {
  return books.flatMap((book) => (book.seriesNumber === undefined ? [] : [book.seriesNumber]));
}

function wholeNumbersUpTo(highest) {
  return Array.from({ length: Math.floor(highest) }, (_, index) => index + 1);
}

function isComplete(series, books) {
  const owned = new Set(numbersOf(books.filter(isOwned)));

  if (series.totalBooks) {
    return wholeNumbersUpTo(series.totalBooks).every((number) => owned.has(number));
  }
  if (series.status !== "complete") return false;

  const known = [...numbersOf(books), ...series.expected.map((entry) => entry.number)];
  if (known.length === 0) return false;

  const required = new Set([...wholeNumbersUpTo(Math.max(...known)), ...known]);
  return [...required].every((number) => owned.has(number));
}

function seriesComplete(series, groups) {
  const started = series.filter((item) => groups.get(item.id).some(isOwned));
  return {
    complete: started.filter((item) => isComplete(item, groups.get(item.id))).length,
    of: started.length,
  };
}

function waitingForContinuation(series, groups) {
  const waiting = [];

  for (const item of series) {
    const books = groups.get(item.id);
    const numbers = numbersOf(books);
    if (!books.some(isOwned) || numbers.length === 0) continue;

    const number = Math.floor(Math.max(...numbers)) + 1;
    if (item.status === "complete" || (item.totalBooks && number > item.totalBooks)) continue;

    const expected = item.expected.find((entry) => entry.number === number);
    waiting.push({
      series: { id: item.id, title: item.title },
      number,
      ...(expected?.expectedYear !== undefined && { expectedYear: expected.expectedYear }),
      ...(expected && { source: expected.source }),
    });
  }

  return waiting.sort(
    (a, b) =>
      (a.expectedYear ?? Infinity) - (b.expectedYear ?? Infinity) ||
      a.series.title.localeCompare(b.series.title),
  );
}

function hasMissingNumber(series, books) {
  if (!series.totalBooks) return false;
  const recorded = new Set(numbersOf(books));
  return wholeNumbersUpTo(series.totalBooks).some((number) => !recorded.has(number));
}

function coverOf(books) {
  return [...books]
    .sort((a, b) => (a.seriesNumber ?? Infinity) - (b.seriesNumber ?? Infinity))
    .find((book) => book.coverUrl)?.coverUrl;
}

function veryMuch(series, groups, books) {
  const continuing = [];
  const fresh = [];

  for (const item of series.filter((entry) => entry.desire === "high")) {
    const group = groups.get(item.id);
    const owned = group.filter(isOwned).length;
    const wantsMore = group.some((book) => !isOwned(book)) || hasMissingNumber(item, group);
    if (owned > 0 && !wantsMore) continue;

    const cover = coverOf(group);
    (owned > 0 ? continuing : fresh).push({
      type: "series",
      group: owned > 0 ? "continue" : "new",
      id: item.id,
      title: item.title,
      ...(cover && { coverUrl: cover }),
      owned,
      total: Math.max(item.totalBooks ?? 0, group.length),
    });
  }

  const standalone = books
    .filter((book) => !isOwned(book) && !groups.has(book.seriesId) && book.desire === "high")
    .sort(byNewest)
    .map((book) => ({
      type: "book",
      id: book.id,
      title: book.title,
      author: book.author,
      ...(book.coverUrl && { coverUrl: book.coverUrl }),
    }));

  return [...continuing, ...fresh, ...standalone].slice(0, VERY_MUCH_LIMIT);
}

function currentlyReading(books, latest, seriesById) {
  const reading = books.filter((book) => book.status === "reading");
  const progressDate = (book) => latest.get(book.id)?.date?.getTime() ?? -Infinity;

  return reading
    .sort((a, b) => progressDate(b) - progressDate(a) || byNewest(a, b))
    .map((book) => {
      const entry = latest.get(book.id);
      return {
        ...bookRef(book, seriesById),
        ...(book.pages && { pages: book.pages }),
        ...(book.startedAt && { startedAt: book.startedAt }),
        ...(entry && {
          progress: {
            percent: entry.percent,
            ...(entry.page !== undefined && entry.page !== null && { page: entry.page }),
            date: entry.date,
          },
        }),
      };
    });
}

function genresOnShelf(books) {
  const counts = new Map();
  for (const book of books.filter(isOwned)) {
    for (const genre of new Set(book.genres)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function quoteOfTheDay(books, now) {
  const quotes = books.flatMap((book) => book.quotes.map((quote) => ({ quote, book })));
  if (quotes.length === 0) return null;

  const { quote, book } = quotes[Math.floor(now.getTime() / DAY_MS) % quotes.length];
  return {
    text: quote.text,
    ...(quote.page !== undefined && { page: quote.page }),
    book: { id: book.id, title: book.title },
  };
}

function newOnShelf(books, seriesById) {
  return books
    .filter(isOwned)
    .sort(byNewest)
    .slice(0, NEW_ON_SHELF_LIMIT)
    .map((book) => bookRef(book, seriesById));
}

function buildHomeStats({ year, now, books, series, entries, goal }) {
  const seriesById = new Map(series.map((item) => [item.id, item]));
  const groups = groupBySeries(books, seriesById);
  const read = readBooks(books, year);

  return {
    year,
    readCount: read.length,
    pagesRead: pagesRead(books, entries, year),
    waitingOnShelf: books.filter((book) => isOwned(book) && book.status === "want").length,
    seriesComplete: seriesComplete(series, groups),
    yearGoal: yearGoalFor(goal, year, read.length, now),
    readPerMonth: readPerMonth(read, seriesById),
    currentlyReading: currentlyReading(books, latestPerBook(entries), seriesById),
    genres: genresOnShelf(books),
    waitingForContinuation: waitingForContinuation(series, groups),
    veryMuch: veryMuch(series, groups, books),
    quoteOfTheDay: quoteOfTheDay(books, now),
    newOnShelf: newOnShelf(books, seriesById),
  };
}

module.exports = { buildHomeStats };
