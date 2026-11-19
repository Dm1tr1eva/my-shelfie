require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const ProgressEntry = require("../models/progressEntry");
const { useTestApp } = require("./helpers/app");

const { api, signIn, userIdOf, addBook } = useTestApp();

function record(cookie, body) {
  return api("/api/progress", { method: "POST", cookie, body });
}

async function latest(cookie) {
  const response = await api("/api/progress", { cookie });
  assert.equal(response.status, 200);
  return response.body.entries;
}

describe("progress API", () => {
  it("refuses a request with no session cookie", async () => {
    const write = await record(undefined, { bookId: "000000000000000000000000", percent: 10 });
    const read = await api("/api/progress");

    assert.equal(write.status, 401);
    assert.equal(read.status, 401);
  });

  it("records a page and works out the percent from the book's pages", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { pages: 300 });

    const response = await record(alice, { bookId: book.id, page: 200 });

    assert.equal(response.status, 201);
    assert.equal(response.body.bookId, book.id);
    assert.equal(response.body.page, 200);
    assert.equal(response.body.percent, 66);
    assert.ok(!Number.isNaN(Date.parse(response.body.date)));
  });

  it("records a percent and works out the nearest page when the book has pages", async () => {
    const alice = await signIn("alice@example.com");
    const up = await addBook(alice, { pages: 170 });
    const down = await addBook(alice, { pages: 130 });

    const roundedUp = await record(alice, { bookId: up.id, percent: 1 });
    const roundedDown = await record(alice, { bookId: down.id, percent: 1 });

    assert.equal(roundedUp.status, 201);
    assert.equal(roundedUp.body.percent, 1);
    assert.equal(roundedUp.body.page, 2);
    assert.equal(roundedDown.body.page, 1);
  });

  it("records page 0 as the start of the book", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { pages: 300 });

    const response = await record(alice, { bookId: book.id, page: 0 });

    assert.equal(response.status, 201);
    assert.equal(response.body.page, 0);
    assert.equal(response.body.percent, 0);
  });

  it("records only a percent for a book with no pages", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { format: "audio" });

    const response = await record(alice, { bookId: book.id, percent: 40 });

    assert.equal(response.status, 201);
    assert.equal(response.body.percent, 40);
    assert.equal(response.body.page, undefined);
  });

  it("counts the last page as the whole book", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { pages: 999 });

    const almost = await record(alice, { bookId: book.id, page: 998 });
    const done = await record(alice, { bookId: book.id, page: 999 });

    assert.equal(almost.body.percent, 99);
    assert.equal(done.body.percent, 100);
  });

  it("rejects a page for a book with no pages and a page past its end, storing nothing", async () => {
    const alice = await signIn("alice@example.com");
    const noPages = await addBook(alice);
    const short = await addBook(alice, { pages: 100 });

    const withoutPages = await record(alice, { bookId: noPages.id, page: 10 });
    const pastTheEnd = await record(alice, { bookId: short.id, page: 101 });

    assert.equal(withoutPages.status, 400);
    assert.deepEqual(withoutPages.body, { error: "page: the book has no page count" });
    assert.equal(pastTheEnd.status, 400);
    assert.deepEqual(pastTheEnd.body, { error: "page: the book has 100 pages" });
    assert.deepEqual(await latest(alice), []);
  });

  it("rejects both a page and a percent, neither, values out of range, fractions, an unknown field and a malformed book id", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { pages: 300 });

    for (const body of [
      { bookId: book.id, page: 10, percent: 3 },
      { bookId: book.id },
      { bookId: book.id, percent: 101 },
      { bookId: book.id, percent: -1 },
      { bookId: book.id, percent: 12.5 },
      { bookId: book.id, page: -1 },
      { bookId: book.id, page: 1.5 },
      { bookId: book.id, percent: 10, date: "2026-01-01" },
      { bookId: "not-an-id", percent: 10 },
      { percent: 10 },
    ]) {
      const response = await record(alice, body);
      assert.equal(response.status, 400, JSON.stringify(body));
    }
    assert.deepEqual(await latest(alice), []);
  });

  it("hides another user's book behind a 404 and stores nothing for it", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const bobsBook = await addBook(bob, { pages: 300 });

    const response = await record(alice, { bookId: bobsBook.id, percent: 50 });

    assert.equal(response.status, 404);
    assert.equal(await ProgressEntry.countDocuments({}), 0);
  });

  it("answers 404 for a book that does not exist", async () => {
    const alice = await signIn("alice@example.com");

    const response = await record(alice, { bookId: "0123456789abcdef01234567", percent: 50 });

    assert.equal(response.status, 404);
  });

  it("lists the latest entry of each book", async () => {
    const alice = await signIn("alice@example.com");
    const first = await addBook(alice, { title: "First", pages: 100 });
    const second = await addBook(alice, { title: "Second" });

    await record(alice, { bookId: first.id, page: 10 });
    await record(alice, { bookId: second.id, percent: 5 });
    await record(alice, { bookId: first.id, page: 30 });
    await record(alice, { bookId: second.id, percent: 60 });
    const entries = await latest(alice);

    assert.deepEqual(
      entries.map((entry) => entry.bookId),
      [second.id, first.id],
    );
    const byBook = Object.fromEntries(entries.map((entry) => [entry.bookId, entry]));
    assert.equal(byBook[first.id].page, 30);
    assert.equal(byBook[first.id].percent, 30);
    assert.equal(byBook[second.id].percent, 60);
  });

  it("takes the later of two entries saved at the same moment", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { pages: 100 });
    const userId = await userIdOf(alice);
    const date = new Date("2026-11-01T10:00:00Z");

    await ProgressEntry.create({ userId, bookId: book.id, date, page: 10, percent: 10 });
    await ProgressEntry.create({ userId, bookId: book.id, date, page: 20, percent: 20 });
    const entries = await latest(alice);

    assert.equal(entries.length, 1);
    assert.equal(entries[0].page, 20);
  });

  it("lists only the caller's progress", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const bobsBook = await addBook(bob);
    await record(bob, { bookId: bobsBook.id, percent: 70 });

    assert.deepEqual(await latest(alice), []);
    assert.equal((await latest(bob)).length, 1);
  });

  it("removes a book's progress when the book is deleted, and keeps the others'", async () => {
    const alice = await signIn("alice@example.com");
    const gone = await addBook(alice, { title: "Gone" });
    const kept = await addBook(alice, { title: "Kept" });
    await record(alice, { bookId: gone.id, percent: 20 });
    await record(alice, { bookId: kept.id, percent: 40 });

    const deleted = await api(`/api/books/${gone.id}`, { method: "DELETE", cookie: alice });

    assert.equal(deleted.status, 204);
    assert.deepEqual(
      (await latest(alice)).map((entry) => entry.bookId),
      [kept.id],
    );
    assert.equal(await ProgressEntry.countDocuments({}), 1);
  });
});
