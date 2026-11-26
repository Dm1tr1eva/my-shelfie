require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Book = require("../models/book");
const { useTestApp } = require("./helpers/app");

const { api, signIn, userIdOf, addBook } = useTestApp();

function todayUtc() {
  return `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
}

async function expectToday(request, field) {
  const before = todayUtc();
  const response = await request();
  const after = todayUtc();

  assert.ok(
    [before, after].includes(response[field]),
    `${field} was ${response[field]}, expected ${before}`,
  );
  return response;
}

async function patchBook(cookie, id, body) {
  const response = await api(`/api/books/${id}`, { method: "PATCH", cookie, body });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}

describe("reading dates set by the status", () => {
  it("dates a book created as reading from today, and one created as read finished today", async () => {
    const alice = await signIn("alice@example.com");

    const reading = await expectToday(() => addBook(alice, { status: "reading" }), "startedAt");
    const read = await expectToday(() => addBook(alice, { status: "read" }), "finishedAt");

    assert.equal(reading.finishedAt, undefined);
    assert.equal(read.startedAt, undefined);
  });

  it("dates nothing for a book created to read or dropped", async () => {
    const alice = await signIn("alice@example.com");

    for (const status of [undefined, "want", "dropped"]) {
      const book = await addBook(alice, status ? { status } : {});

      assert.equal(book.startedAt, undefined, String(status));
      assert.equal(book.finishedAt, undefined, String(status));
    }
  });

  it("keeps the dates a new book is created with", async () => {
    const alice = await signIn("alice@example.com");

    const read = await addBook(alice, { status: "read", finishedAt: "2024-05-01" });
    const reading = await addBook(alice, { status: "reading", startedAt: "2024-04-01" });

    assert.equal(read.finishedAt, "2024-05-01T00:00:00.000Z");
    assert.equal(reading.startedAt, "2024-04-01T00:00:00.000Z");
  });

  it("starts a book today when it moves to reading and finishes it today when it moves to read", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    const reading = await expectToday(
      () => patchBook(alice, book.id, { status: "reading" }),
      "startedAt",
    );
    const read = await expectToday(
      () => patchBook(alice, book.id, { status: "read" }),
      "finishedAt",
    );

    assert.equal(reading.finishedAt, undefined);
    assert.equal(read.startedAt, reading.startedAt);
  });

  it("stores a date sent with the status instead of today, and clears it on null", async () => {
    const alice = await signIn("alice@example.com");
    const sent = await addBook(alice);
    const cleared = await addBook(alice);

    const withDate = await patchBook(alice, sent.id, {
      status: "read",
      finishedAt: "2025-12-31",
    });
    const withNull = await patchBook(alice, cleared.id, { status: "read", finishedAt: null });

    assert.equal(withDate.finishedAt, "2025-12-31T00:00:00.000Z");
    assert.equal(withNull.finishedAt, undefined);
  });

  it("never overwrites a date the book already has", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, {
      status: "dropped",
      startedAt: "2024-01-10",
      finishedAt: "2024-02-20",
    });

    const reading = await patchBook(alice, book.id, { status: "reading" });
    const read = await patchBook(alice, book.id, { status: "read" });

    assert.equal(reading.startedAt, "2024-01-10T00:00:00.000Z");
    assert.equal(read.finishedAt, "2024-02-20T00:00:00.000Z");
  });

  it("keeps the start date of a book that has no finish date when it starts again", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { status: "reading", startedAt: "2025-03-01" });

    await patchBook(alice, book.id, { status: "dropped" });
    const again = await patchBook(alice, book.id, { status: "reading" });

    assert.equal(again.startedAt, "2025-03-01T00:00:00.000Z");
    assert.equal(again.finishedAt, undefined);
  });

  it("keeps both dates when the book goes back from read to reading or to want", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, {
      status: "read",
      startedAt: "2026-01-05",
      finishedAt: "2026-02-01",
    });

    const back = await patchBook(alice, book.id, { status: "reading" });
    const want = await patchBook(alice, book.id, { status: "want" });

    for (const answer of [back, want]) {
      assert.equal(answer.startedAt, "2026-01-05T00:00:00.000Z");
      assert.equal(answer.finishedAt, "2026-02-01T00:00:00.000Z");
    }
  });

  it("dates nothing when the status sent is the one the book already has", async () => {
    const alice = await signIn("alice@example.com");
    const { insertedId } = await Book.collection.insertOne({
      userId: new Book.base.Types.ObjectId(await userIdOf(alice)),
      title: "Read long ago",
      author: "An author",
      status: "read",
    });

    const again = await patchBook(alice, String(insertedId), { status: "read" });
    const rated = await patchBook(alice, String(insertedId), { rating: 4 });

    assert.equal(again.finishedAt, undefined);
    assert.equal(rated.finishedAt, undefined);
  });

  it("answers 404 and dates nothing for another user's book", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book.id}`, {
      method: "PATCH",
      cookie: bob,
      body: { status: "read" },
    });
    const stored = await api(`/api/books/${book.id}`, { cookie: alice });

    assert.equal(response.status, 404);
    assert.equal(stored.body.status, "want");
    assert.equal(stored.body.finishedAt, undefined);
  });

  it("counts a book marked read through the API in this year's stats", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { status: "reading" });

    const before = await api("/api/stats", { cookie: alice });
    await patchBook(alice, book.id, { status: "read" });
    const after = await api("/api/stats", { cookie: alice });

    assert.equal(before.body.readCount, 0);
    assert.equal(after.body.readCount, 1);
    const month = after.body.readPerMonth.find((entry) => entry.books.length > 0);
    assert.equal(month.month, new Date().getUTCMonth() + 1);
    assert.equal(month.books[0].id, book.id);
  });
});
