require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Book = require("../models/book");
const Series = require("../models/series");
const ProgressEntry = require("../models/progressEntry");
const { useTestApp } = require("./helpers/app");

const { api, signIn, userIdOf, addBook, addSeries } = useTestApp();

const THIS_YEAR = new Date().getUTCFullYear();

function emptyStats(year) {
  return {
    year,
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
  };
}

async function statsOf(cookie, query = "") {
  const response = await api(`/api/stats${query}`, { cookie });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}

async function record(cookie, body) {
  const response = await api("/api/progress", { method: "POST", cookie, body });
  assert.equal(response.status, 201, JSON.stringify(response.body));
}

async function buildShelf(cookie) {
  const roots = await addSeries(cookie, {
    title: "Roots",
    totalBooks: 3,
    genres: ["Fantasy"],
    desire: "high",
  });
  const first = await addBook(cookie, {
    title: "Roots One",
    seriesId: roots.id,
    seriesNumber: 1,
    status: "read",
    rating: 5,
    finishedAt: `${THIS_YEAR}-03-15`,
  });
  const reading = await addBook(cookie, {
    title: "Roots Two",
    seriesId: roots.id,
    seriesNumber: 2,
    status: "reading",
    pages: 400,
    startedAt: `${THIS_YEAR}-03-20`,
  });
  const waiting = await addBook(cookie, {
    title: "Classic",
    genres: ["Classics"],
    quotes: [{ text: "A line worth keeping", page: 5 }],
  });
  const wanted = await addBook(cookie, { title: "Flame", ownership: "wanted", desire: "high" });

  await record(cookie, { bookId: reading.id, page: 100 });
  await record(cookie, { bookId: reading.id, percent: 50 });
  const goal = await api("/api/year-goal", {
    method: "PUT",
    cookie,
    body: { year: THIS_YEAR, books: 4 },
  });
  assert.equal(goal.status, 200);

  return { roots, first, reading, waiting, wanted };
}

describe("home stats API", () => {
  it("refuses a request with no session cookie", async () => {
    const response = await api("/api/stats");

    assert.equal(response.status, 401);
  });

  it("answers zeros and empty blocks for a new account", async () => {
    const alice = await signIn("alice@example.com");

    assert.deepEqual(await statsOf(alice), emptyStats(THIS_YEAR));
  });

  it("answers every block of Home for a shelf built through the API, for the current year", async () => {
    const alice = await signIn("alice@example.com");
    const { roots, first, reading, waiting, wanted } = await buildShelf(alice);

    const stats = await statsOf(alice);

    assert.equal(stats.year, THIS_YEAR);
    assert.equal(stats.readCount, 1);
    assert.equal(stats.pagesRead, 200);
    assert.equal(stats.waitingOnShelf, 1);
    assert.deepEqual(stats.seriesComplete, { complete: 0, of: 1 });
    assert.equal(stats.yearGoal.target, 4);
    assert.equal(stats.yearGoal.done, 1);
    assert.equal(stats.yearGoal.percent, 25);
    assert.ok(stats.yearGoal.weeksLeft >= 1 && stats.yearGoal.weeksLeft <= 53);
    assert.deepEqual(stats.readPerMonth[2].books, [
      {
        id: first.id,
        title: "Roots One",
        author: "An author",
        format: "paper",
        series: { id: roots.id, title: "Roots", number: 1 },
        rating: 5,
        finishedAt: `${THIS_YEAR}-03-15T00:00:00.000Z`,
      },
    ]);
    assert.equal(stats.currentlyReading.length, 1);
    assert.equal(stats.currentlyReading[0].id, reading.id);
    assert.equal(stats.currentlyReading[0].startedAt, `${THIS_YEAR}-03-20T00:00:00.000Z`);
    assert.equal(stats.currentlyReading[0].progress.percent, 50);
    assert.equal(stats.currentlyReading[0].progress.page, 200);
    assert.deepEqual(stats.genres, [
      { name: "Fantasy", count: 2 },
      { name: "Classics", count: 1 },
    ]);
    assert.deepEqual(stats.waitingForContinuation, [
      { series: { id: roots.id, title: "Roots" }, number: 3 },
    ]);
    assert.deepEqual(
      stats.veryMuch.map((item) => [item.type, item.id]),
      [
        ["series", roots.id],
        ["book", wanted.id],
      ],
    );
    assert.deepEqual(stats.quoteOfTheDay, {
      text: "A line worth keeping",
      page: 5,
      book: { id: waiting.id, title: "Classic" },
    });
    assert.deepEqual(
      stats.newOnShelf.map((item) => item.id),
      [waiting.id, reading.id, first.id],
    );
  });

  it("counts the year asked for in the read books, months, pages and goal", async () => {
    const alice = await signIn("alice@example.com");
    await buildShelf(alice);
    await addBook(alice, { status: "read", finishedAt: "2024-07-01" });

    const past = await statsOf(alice, "?year=2024");

    assert.equal(past.year, 2024);
    assert.equal(past.readCount, 1);
    assert.equal(past.readPerMonth[6].books.length, 1);
    assert.equal(past.pagesRead, 0);
    assert.equal(past.yearGoal, null);
    assert.equal(past.currentlyReading.length, 1);
  });

  it("never counts another user's books, series, progress or goal", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    await buildShelf(bob);
    const own = await addBook(alice, { pages: 100, status: "reading" });
    await record(alice, { bookId: own.id, page: 10 });
    await ProgressEntry.collection.insertOne({
      userId: new Book.base.Types.ObjectId(await userIdOf(bob)),
      bookId: new Book.base.Types.ObjectId(own.id),
      date: new Date(),
      page: 90,
      percent: 90,
    });

    const stats = await statsOf(alice);

    assert.deepEqual(stats, {
      ...emptyStats(THIS_YEAR),
      pagesRead: 10,
      currentlyReading: stats.currentlyReading,
      newOnShelf: stats.newOnShelf,
    });
    assert.deepEqual(
      stats.currentlyReading.map((item) => item.id),
      [own.id],
    );
    assert.deepEqual(
      stats.newOnShelf.map((item) => item.id),
      [own.id],
    );
  });

  it("reads books, series and entries saved before the v3 fields with their defaults", async () => {
    const alice = await signIn("alice@example.com");
    const owner = { userId: new Book.base.Types.ObjectId(await userIdOf(alice)) };
    const { insertedId: seriesId } = await Series.collection.insertOne({
      ...owner,
      title: "Old saga",
      status: "complete",
      genres: ["Fantasy"],
    });
    const now = new Date();
    await Book.collection.insertMany([
      {
        ...owner,
        title: "Old one",
        author: "An author",
        status: "read",
        seriesId,
        seriesNumber: 1,
        finishedAt: new Date(Date.UTC(THIS_YEAR, 1, 1)),
        createdAt: now,
        updatedAt: now,
      },
      {
        ...owner,
        title: "Old two",
        author: "An author",
        status: "want",
        seriesId,
        seriesNumber: 2,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    const { insertedId: pagedId } = await Book.collection.insertOne({
      ...owner,
      title: "Old paged",
      author: "An author",
      status: "reading",
      pages: 200,
      createdAt: now,
      updatedAt: now,
    });
    await ProgressEntry.collection.insertMany([
      { ...owner, bookId: pagedId, date: new Date(Date.UTC(THIS_YEAR - 1, 11, 31)), percent: 25 },
      { ...owner, bookId: pagedId, date: new Date(Date.UTC(THIS_YEAR, 0, 2)), percent: 75 },
    ]);

    const stats = await statsOf(alice);

    assert.equal(stats.readCount, 1);
    assert.equal(stats.pagesRead, 100);
    assert.equal(stats.waitingOnShelf, 1);
    assert.deepEqual(stats.seriesComplete, { complete: 1, of: 1 });
    assert.deepEqual(stats.genres, [{ name: "Fantasy", count: 2 }]);
    assert.deepEqual(stats.waitingForContinuation, []);
    assert.deepEqual(stats.veryMuch, []);
    assert.equal(stats.quoteOfTheDay, null);
    assert.ok(stats.newOnShelf.every((book) => book.format === "paper"));
    assert.equal(stats.newOnShelf.length, 3);
    assert.deepEqual(stats.currentlyReading[0].progress, {
      percent: 75,
      date: new Date(Date.UTC(THIS_YEAR, 0, 2)).toISOString(),
    });
  });

  it("accepts a year from 2000 to 2100 and rejects anything else in the query", async () => {
    const alice = await signIn("alice@example.com");

    assert.equal((await statsOf(alice, "?year=2000")).year, 2000);
    assert.equal((await statsOf(alice, "?year=2100")).year, 2100);

    for (const [query, error] of [
      ["?year=1999", "year: Too small: expected number to be >=2000"],
      ["?year=2101", "year: Too big: expected number to be <=2100"],
      ["?year=abcd", "year: Expected a four-digit year"],
      ["?year=", "year: Expected a four-digit year"],
      ["?year=2026.5", "year: Expected a four-digit year"],
      ["?year=%202026", "year: Expected a four-digit year"],
      ["?year=0x7EA", "year: Expected a four-digit year"],
      ["?year=2026&year=2025", "year: Invalid input: expected string, received array"],
      ["?month=3", 'query: Unrecognized key: "month"'],
    ]) {
      const response = await api(`/api/stats${query}`, { cookie: alice });

      assert.equal(response.status, 400, query);
      assert.deepEqual(response.body, { error }, query);
    }
  });
});
