const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { buildHomeStats } = require("../services/homeStats");

const NOW = new Date("2026-11-26T12:00:00Z");

let counter = 0;

function book(overrides = {}) {
  counter += 1;
  return {
    id: `book-${String(counter).padStart(4, "0")}`,
    title: `Book ${counter}`,
    author: "An author",
    status: "want",
    ownership: "owned",
    format: "paper",
    desire: "normal",
    genres: [],
    quotes: [],
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, counter)),
    ...overrides,
  };
}

function series(overrides = {}) {
  counter += 1;
  return {
    id: `series-${counter}`,
    title: `Series ${counter}`,
    status: "ongoing",
    desire: "normal",
    expected: [],
    genres: [],
    ...overrides,
  };
}

function entry(target, date, position) {
  return { bookId: target.id, date: new Date(date), ...position };
}

function stats({ year = 2026, now = NOW, books = [], series: list = [], entries = [], goal } = {}) {
  return buildHomeStats({ year, now, books, series: list, entries, goal: goal ?? null });
}

describe("home stats", () => {
  it("answers zeros, twelve empty months and no goal or quote for an empty shelf", () => {
    const result = stats();

    assert.deepEqual(result, {
      year: 2026,
      readCount: 0,
      pagesRead: 0,
      waitingOnShelf: 0,
      seriesComplete: { complete: 0, of: 0 },
      yearGoal: null,
      readPerMonth: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, books: [] })),
      currentlyReading: [],
      genres: [],
      waitingForContinuation: [],
      veryMuch: [],
      quoteOfTheDay: null,
      newOnShelf: [],
    });
  });

  it("counts read books finished within the UTC year, audiobooks and wanted books included", () => {
    const books = [
      book({ title: "First moment", status: "read", finishedAt: new Date("2026-01-01T00:00:00Z") }),
      book({
        title: "Last moment",
        status: "read",
        finishedAt: new Date("2026-12-31T23:59:59.999Z"),
      }),
      book({ title: "Audio", status: "read", format: "audio", finishedAt: new Date("2026-06-01") }),
      book({
        title: "Borrowed",
        status: "read",
        ownership: "wanted",
        finishedAt: new Date("2026-06-02"),
      }),
      book({
        title: "Last year",
        status: "read",
        finishedAt: new Date("2025-12-31T23:59:59.999Z"),
      }),
      book({ title: "Next year", status: "read", finishedAt: new Date("2027-01-01T00:00:00Z") }),
      book({ title: "No date", status: "read" }),
      book({ title: "Dropped", status: "dropped", finishedAt: new Date("2026-06-03") }),
    ];

    const result = stats({ books });

    assert.equal(result.readCount, 4);
    assert.deepEqual(
      result.readPerMonth.flatMap((month) => month.books.map((item) => item.title)),
      ["First moment", "Audio", "Borrowed", "Last moment"],
    );
  });

  it("counts the year that is asked for, not the current one", () => {
    const books = [
      book({ status: "read", finishedAt: new Date("2025-03-01") }),
      book({ status: "read", finishedAt: new Date("2026-03-01") }),
    ];

    assert.equal(stats({ year: 2025, books }).readCount, 1);
    assert.equal(stats({ year: 2024, books }).readCount, 0);
  });

  it("puts each read book into the month it was finished, with its series number and rating", () => {
    const saga = series({ title: "Saga" });
    const books = [
      book({
        title: "Late",
        status: "read",
        rating: 5,
        coverUrl: "https://example.com/late.jpg",
        seriesId: saga.id,
        seriesNumber: 3,
        finishedAt: new Date("2026-09-20"),
      }),
      book({ title: "Early", status: "read", finishedAt: new Date("2026-09-02") }),
      book({ title: "Spring", status: "read", finishedAt: new Date("2026-04-30T23:30:00Z") }),
    ];

    const months = stats({ books, series: [saga] }).readPerMonth;

    assert.deepEqual(
      months.map((month) => month.books.length),
      [0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0],
    );
    assert.deepEqual(
      months[8].books.map((item) => item.title),
      ["Early", "Late"],
    );
    assert.deepEqual(months[8].books[1], {
      id: books[0].id,
      title: "Late",
      author: "An author",
      format: "paper",
      coverUrl: "https://example.com/late.jpg",
      series: { id: saga.id, title: "Saga", number: 3 },
      rating: 5,
      finishedAt: new Date("2026-09-20"),
    });
    assert.equal(months[8].books[0].rating, undefined);
    assert.equal(months[8].books[0].series, undefined);
  });

  describe("pages this year", () => {
    it("adds the increase between consecutive entries and starts the first entry ever from page 0", () => {
      const novel = book({ pages: 400 });
      const entries = [
        entry(novel, "2026-02-01", { page: 50, percent: 12 }),
        entry(novel, "2026-02-03", { page: 120, percent: 30 }),
        entry(novel, "2026-02-05", { page: 400, percent: 100 }),
      ];

      assert.equal(stats({ books: [novel], entries }).pagesRead, 400);
    });

    it("measures the first entry of the year from the last entry of the year before", () => {
      const novel = book({ pages: 400 });
      const entries = [
        entry(novel, "2025-12-31T23:59:59.999Z", { page: 300, percent: 75 }),
        entry(novel, "2026-01-01T00:00:00Z", { page: 350, percent: 87 }),
        entry(novel, "2026-12-31T23:59:59.999Z", { page: 380, percent: 95 }),
        entry(novel, "2027-01-01T00:00:00Z", { page: 400, percent: 100 }),
      ];

      assert.equal(stats({ books: [novel], entries }).pagesRead, 80);
      assert.equal(stats({ year: 2025, books: [novel], entries }).pagesRead, 300);
    });

    it("counts nothing for a step back and counts again from the lower page", () => {
      const novel = book({ pages: 400 });
      const entries = [
        entry(novel, "2026-03-01", { page: 200, percent: 50 }),
        entry(novel, "2026-03-02", { page: 20, percent: 5 }),
        entry(novel, "2026-03-03", { page: 60, percent: 15 }),
      ];

      assert.equal(stats({ books: [novel], entries }).pagesRead, 240);
    });

    it("reads an entry without a page as the share of the book's current pages", () => {
      const novel = book({ pages: 300 });
      const entries = [
        entry(novel, "2026-03-01", { percent: 10 }),
        entry(novel, "2026-03-02", { page: 150, percent: 50 }),
      ];

      assert.equal(stats({ books: [novel], entries }).pagesRead, 150);
    });

    it("adds the rest of the book when it is finished", () => {
      const novel = book({ pages: 357 });
      const entries = [
        entry(novel, "2026-03-01", { page: 100, percent: 28 }),
        entry(novel, "2026-03-02", { page: 357, percent: 100 }),
      ];

      assert.equal(stats({ books: [novel], entries }).pagesRead, 357);
    });

    it("skips audiobooks, books without pages and entries whose book is gone", () => {
      const audio = book({ format: "audio", pages: 500 });
      const noPages = book();
      const gone = { id: "book-gone" };
      const entries = [
        entry(audio, "2026-03-01", { page: 250, percent: 50 }),
        entry(noPages, "2026-03-01", { percent: 50 }),
        entry(gone, "2026-03-01", { page: 100, percent: 50 }),
      ];

      assert.equal(stats({ books: [audio, noPages], entries }).pagesRead, 0);
    });

    it("adds up several books", () => {
      const one = book({ pages: 100 });
      const two = book({ pages: 200 });
      const entries = [
        entry(one, "2026-03-01", { page: 30, percent: 30 }),
        entry(two, "2026-03-01", { page: 50, percent: 25 }),
        entry(one, "2026-03-02", { page: 100, percent: 100 }),
      ];

      assert.equal(stats({ books: [one, two], entries }).pagesRead, 150);
    });
  });

  it("counts owned books still to read as waiting on the shelf", () => {
    const books = [
      book({ status: "want" }),
      book({ status: "want" }),
      book({ status: "want", ownership: "wanted" }),
      book({ status: "reading" }),
      book({ status: "read" }),
    ];

    assert.equal(stats({ books }).waitingOnShelf, 2);
  });

  describe("series complete", () => {
    it("completes a series with a size when every whole number up to it is owned", () => {
      const full = series({ totalBooks: 2 });
      const missing = series({ totalBooks: 3 });
      const wantedOne = series({ totalBooks: 2 });
      const books = [
        book({ seriesId: full.id, seriesNumber: 1 }),
        book({ seriesId: full.id, seriesNumber: 2 }),
        book({ seriesId: full.id, seriesNumber: 2.5, ownership: "wanted" }),
        book({ seriesId: missing.id, seriesNumber: 1 }),
        book({ seriesId: missing.id, seriesNumber: 2 }),
        book({ seriesId: missing.id }),
        book({ seriesId: wantedOne.id, seriesNumber: 1 }),
        book({ seriesId: wantedOne.id, seriesNumber: 2, ownership: "wanted" }),
      ];

      assert.deepEqual(stats({ books, series: [full, missing, wantedOne] }).seriesComplete, {
        complete: 1,
        of: 3,
      });
    });

    it("completes a finished series without a size when no known number is missing", () => {
      const whole = series({ status: "complete" });
      const gap = series({ status: "complete" });
      const novella = series({ status: "complete" });
      const announced = series({ status: "complete", expected: [{ number: 3, source: "manual" }] });
      const ongoing = series({ status: "ongoing" });
      const books = [
        book({ seriesId: whole.id, seriesNumber: 1 }),
        book({ seriesId: whole.id, seriesNumber: 2 }),
        book({ seriesId: gap.id, seriesNumber: 1 }),
        book({ seriesId: gap.id, seriesNumber: 3 }),
        book({ seriesId: novella.id, seriesNumber: 1 }),
        book({ seriesId: novella.id, seriesNumber: 1.5, ownership: "wanted" }),
        book({ seriesId: announced.id, seriesNumber: 1 }),
        book({ seriesId: announced.id, seriesNumber: 2 }),
        book({ seriesId: ongoing.id, seriesNumber: 1 }),
      ];

      const result = stats({ books, series: [whole, gap, novella, announced, ongoing] });

      assert.deepEqual(result.seriesComplete, { complete: 1, of: 5 });
    });

    it("leaves out series with no owned book and never completes an unnumbered one", () => {
      const wishlistOnly = series({ totalBooks: 1 });
      const unnumbered = series({ status: "complete" });
      const books = [
        book({ seriesId: wishlistOnly.id, seriesNumber: 1, ownership: "wanted" }),
        book({ seriesId: unnumbered.id }),
      ];

      assert.deepEqual(stats({ books, series: [wishlistOnly, unnumbered] }).seriesComplete, {
        complete: 0,
        of: 1,
      });
    });
  });

  describe("year goal", () => {
    it("answers the ring for the goal of the year asked, rounding the percent", () => {
      const books = Array.from({ length: 9 }, () =>
        book({ status: "read", finishedAt: new Date("2026-05-01") }),
      );

      const result = stats({ books, goal: { year: 2026, books: 24 } });

      assert.deepEqual(result.yearGoal, {
        year: 2026,
        target: 24,
        done: 9,
        percent: 38,
        weeksLeft: 6,
      });
    });

    it("answers null without a goal or for a goal of another year", () => {
      assert.equal(stats({ goal: null }).yearGoal, null);
      assert.equal(stats({ goal: { year: 2025, books: 12 } }).yearGoal, null);
      assert.equal(stats({ year: 2025, goal: { year: 2026, books: 12 } }).yearGoal, null);
    });

    it("lets the percent pass 100", () => {
      const books = [
        book({ status: "read", finishedAt: new Date("2026-05-01") }),
        book({ status: "read", finishedAt: new Date("2026-05-02") }),
        book({ status: "read", finishedAt: new Date("2026-05-03") }),
      ];

      assert.equal(stats({ books, goal: { year: 2026, books: 2 } }).yearGoal.percent, 150);
    });

    it("counts the weeks left from the UTC day, today included", () => {
      const goal = (year) => ({ year, books: 10 });
      const weeks = (year, now) =>
        stats({ year, now: new Date(now), goal: goal(year) }).yearGoal.weeksLeft;

      assert.equal(weeks(2026, "2026-12-31T23:59:59Z"), 1);
      assert.equal(weeks(2026, "2026-12-25T00:00:00Z"), 1);
      assert.equal(weeks(2026, "2026-12-24T23:59:59Z"), 2);
      assert.equal(weeks(2026, "2026-01-01T00:00:00Z"), 53);
      assert.equal(weeks(2025, "2026-01-01T00:00:00Z"), 0);
      assert.equal(weeks(2027, "2026-06-01T00:00:00Z"), 53);
    });
  });

  it("lists books being read, the latest progress first, with their series, start and position", () => {
    const saga = series({ title: "Roots" });
    const stale = book({ title: "Stale", status: "reading", pages: 300 });
    const fresh = book({
      title: "Fresh",
      status: "reading",
      pages: 500,
      seriesId: saga.id,
      seriesNumber: 1,
      startedAt: new Date("2026-10-03"),
    });
    const untouched = book({ title: "Untouched", status: "reading", ownership: "wanted" });
    const audio = book({ title: "Audio", status: "reading", format: "audio" });
    const done = book({ title: "Done", status: "read" });
    const entries = [
      entry(fresh, "2026-11-01", { page: 100, percent: 20 }),
      entry(stale, "2026-11-02", { page: 30, percent: 10 }),
      entry(fresh, "2026-11-03", { page: 250, percent: 50 }),
      entry(audio, "2026-11-02T12:00:00Z", { percent: 40 }),
      entry(done, "2026-11-05", { percent: 100 }),
    ];

    const reading = stats({
      books: [stale, fresh, untouched, audio, done],
      series: [saga],
      entries,
    }).currentlyReading;

    assert.deepEqual(
      reading.map((item) => item.title),
      ["Fresh", "Audio", "Stale", "Untouched"],
    );
    assert.deepEqual(reading[0], {
      id: fresh.id,
      title: "Fresh",
      author: "An author",
      format: "paper",
      series: { id: saga.id, title: "Roots", number: 1 },
      pages: 500,
      startedAt: new Date("2026-10-03"),
      progress: { percent: 50, page: 250, date: new Date("2026-11-03") },
    });
    assert.deepEqual(reading[1].progress, { percent: 40, date: new Date("2026-11-02T12:00:00Z") });
    assert.equal(reading[3].progress, undefined);
  });

  it("counts each genre once per owned book, most common first", () => {
    const books = [
      book({ genres: ["Fantasy", "Romance"] }),
      book({ genres: ["Fantasy"] }),
      book({ genres: ["Classics"] }),
      book({ genres: ["Fantasy", "Classics"], ownership: "wanted" }),
      book({ genres: ["Romance"] }),
    ];

    assert.deepEqual(stats({ books }).genres, [
      { name: "Fantasy", count: 2 },
      { name: "Romance", count: 2 },
      { name: "Classics", count: 1 },
    ]);
  });

  describe("waiting for continuation", () => {
    it("offers the number after the highest known book of a started series, with its expected year and source", () => {
      const roots = series({
        title: "Roots",
        totalBooks: 6,
        expected: [
          { number: 4, expectedYear: 2027, source: "fantlab" },
          { number: 5, source: "ai" },
        ],
      });
      const empyrean = series({ title: "Empyrean" });
      const books = [
        book({ seriesId: roots.id, seriesNumber: 1 }),
        book({ seriesId: roots.id, seriesNumber: 2 }),
        book({ seriesId: roots.id, seriesNumber: 3, ownership: "wanted" }),
        book({ seriesId: empyrean.id, seriesNumber: 2.5 }),
      ];

      assert.deepEqual(stats({ books, series: [empyrean, roots] }).waitingForContinuation, [
        {
          series: { id: roots.id, title: "Roots" },
          number: 4,
          expectedYear: 2027,
          source: "fantlab",
        },
        { series: { id: empyrean.id, title: "Empyrean" }, number: 3 },
      ]);
    });

    it("gives the source of an expected number that has no year", () => {
      const saga = series({ expected: [{ number: 2, source: "ai" }] });
      const books = [book({ seriesId: saga.id, seriesNumber: 1 })];

      assert.deepEqual(stats({ books, series: [saga] }).waitingForContinuation, [
        { series: { id: saga.id, title: saga.title }, number: 2, source: "ai" },
      ]);
    });

    it("skips finished series, series past their size, series not started and unnumbered ones", () => {
      const finished = series({ status: "complete", expected: [{ number: 3, source: "manual" }] });
      const full = series({ totalBooks: 2 });
      const notStarted = series();
      const unnumbered = series();
      const books = [
        book({ seriesId: finished.id, seriesNumber: 2 }),
        book({ seriesId: full.id, seriesNumber: 2 }),
        book({ seriesId: notStarted.id, seriesNumber: 1, ownership: "wanted" }),
        book({ seriesId: unnumbered.id }),
      ];

      const result = stats({ books, series: [finished, full, notStarted, unnumbered] });

      assert.deepEqual(result.waitingForContinuation, []);
    });

    it("lists dated continuations by year, then the rest by title", () => {
      const late = series({
        title: "B late",
        expected: [{ number: 2, expectedYear: 2028, source: "ai" }],
      });
      const soon = series({
        title: "C soon",
        expected: [{ number: 2, expectedYear: 2027, source: "ai" }],
      });
      const unknownA = series({ title: "A unknown" });
      const unknownD = series({ title: "D unknown" });
      const all = [late, soon, unknownA, unknownD];
      const books = all.map((item) => book({ seriesId: item.id, seriesNumber: 1 }));

      assert.deepEqual(
        stats({ books, series: all }).waitingForContinuation.map((item) => item.series.title),
        ["C soon", "B late", "A unknown", "D unknown"],
      );
    });
  });

  describe("very much", () => {
    it("lists series to continue, then new series, then standalone books, all wanted very much", () => {
      const roots = series({ title: "Roots", desire: "high", totalBooks: 6 });
      const court = series({ title: "Court", desire: "high" });
      const calm = series({ title: "Calm", desire: "normal" });
      const books = [
        book({ title: "Flame", ownership: "wanted", desire: "high" }),
        book({ seriesId: roots.id, seriesNumber: 1, coverUrl: "https://example.com/r1.jpg" }),
        book({ seriesId: roots.id, seriesNumber: 2 }),
        book({ seriesId: court.id, seriesNumber: 2, ownership: "wanted" }),
        book({
          seriesId: court.id,
          seriesNumber: 1,
          ownership: "wanted",
          coverUrl: "https://example.com/c1.jpg",
        }),
        book({ seriesId: calm.id, seriesNumber: 1, ownership: "wanted" }),
        book({ title: "Someday", ownership: "wanted", desire: "someday" }),
        book({ title: "Owned high", desire: "high" }),
      ];

      assert.deepEqual(stats({ books, series: [court, roots, calm] }).veryMuch, [
        {
          type: "series",
          group: "continue",
          id: roots.id,
          title: "Roots",
          coverUrl: "https://example.com/r1.jpg",
          owned: 2,
          total: 6,
        },
        {
          type: "series",
          group: "new",
          id: court.id,
          title: "Court",
          coverUrl: "https://example.com/c1.jpg",
          owned: 0,
          total: 2,
        },
        { type: "book", id: books[0].id, title: "Flame", author: "An author" },
      ]);
    });

    it("leaves out a started series with nothing left to want", () => {
      const done = series({ desire: "high", totalBooks: 2 });
      const unsized = series({ desire: "high" });
      const books = [
        book({ seriesId: done.id, seriesNumber: 1 }),
        book({ seriesId: done.id, seriesNumber: 2 }),
        book({ seriesId: unsized.id, seriesNumber: 1 }),
      ];

      assert.deepEqual(stats({ books, series: [done, unsized] }).veryMuch, []);
    });

    it("shows three at most, the newest standalone books first", () => {
      const books = Array.from({ length: 5 }, (_, index) =>
        book({ title: `Wanted ${index}`, ownership: "wanted", desire: "high" }),
      );

      assert.deepEqual(
        stats({ books }).veryMuch.map((item) => item.title),
        ["Wanted 4", "Wanted 3", "Wanted 2"],
      );
    });
  });

  describe("quote of the day", () => {
    const books = [
      book({ title: "Priory", quotes: [{ text: "One", page: 214 }, { text: "Two" }] }),
      book({ title: "Empty" }),
      book({ title: "Fourth Wing", quotes: [{ text: "Three" }] }),
    ];
    const quoteOn = (now) => stats({ books, now: new Date(now) }).quoteOfTheDay;

    it("keeps one quote for the whole UTC day and moves to the next one the day after", () => {
      const morning = quoteOn("2026-11-26T00:00:00Z");
      const night = quoteOn("2026-11-26T23:59:59.999Z");
      const tomorrow = quoteOn("2026-11-27T00:00:00Z");

      assert.deepEqual(morning, night);
      assert.notDeepEqual(morning, tomorrow);
    });

    it("shows every quote once before repeating, with its page and book", () => {
      const days = ["2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"].map((day) =>
        quoteOn(`${day}T12:00:00Z`),
      );

      assert.deepEqual(
        new Set(days.slice(0, 3).map((quote) => quote.text)),
        new Set(["One", "Two", "Three"]),
      );
      assert.deepEqual(days[3], days[0]);
      assert.deepEqual(
        days.find((quote) => quote.text === "One"),
        { text: "One", page: 214, book: { id: books[0].id, title: "Priory" } },
      );
    });
  });

  it("shows the six newest owned books as new on the shelf", () => {
    const books = Array.from({ length: 8 }, (_, index) =>
      book({ title: `Owned ${index}`, ownership: index === 7 ? "wanted" : "owned" }),
    );

    assert.deepEqual(
      stats({ books }).newOnShelf.map((item) => item.title),
      ["Owned 6", "Owned 5", "Owned 4", "Owned 3", "Owned 2", "Owned 1"],
    );
  });
});
