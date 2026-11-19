require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Book = require("../models/book");
const { useTestApp } = require("./helpers/app");

const { api, signIn, userIdOf, addBook } = useTestApp();

async function insertOldBook(cookie, fields) {
  const userId = await userIdOf(cookie);
  const { insertedId } = await Book.collection.insertOne({
    userId: new Book.base.Types.ObjectId(userId),
    title: "Old book",
    author: "Old author",
    ...fields,
  });
  return String(insertedId);
}

function patchBook(cookie, id, body) {
  return api(`/api/books/${id}`, { method: "PATCH", cookie, body });
}

describe("book details", () => {
  it("stores pages, duration, moods, a recommendation, quotes, desire and age rating", async () => {
    const alice = await signIn("alice@example.com");

    const book = await addBook(alice, {
      pages: 412,
      durationMinutes: 870,
      moods: ["Cosy", "Tense"],
      recommend: "maybe",
      quotes: [{ text: "  A line worth keeping.  ", page: 12 }, { text: "No page here" }],
      desire: "high",
      ageRating: "16",
    });
    const fetched = await api(`/api/books/${book.id}`, { cookie: alice });

    assert.equal(fetched.body.pages, 412);
    assert.equal(fetched.body.durationMinutes, 870);
    assert.deepEqual(fetched.body.moods, ["Cosy", "Tense"]);
    assert.equal(fetched.body.recommend, "maybe");
    assert.deepEqual(fetched.body.quotes, [
      { text: "A line worth keeping.", page: 12 },
      { text: "No page here" },
    ]);
    assert.equal(fetched.body.desire, "high");
    assert.equal(fetched.body.ageRating, "16");
  });

  it("gives a new book normal desire, no age rating, and no moods or quotes", async () => {
    const alice = await signIn("alice@example.com");

    const book = await addBook(alice);

    assert.equal(book.desire, "normal");
    assert.equal(book.ageRating, "none");
    assert.deepEqual(book.moods, []);
    assert.deepEqual(book.quotes, []);
    assert.equal(book.pages, undefined);
    assert.equal(book.recommend, undefined);
  });

  it("reads a book saved before these fields existed with the same defaults", async () => {
    const alice = await signIn("alice@example.com");
    const id = await insertOldBook(alice, { status: "read" });

    const fetched = await api(`/api/books/${id}`, { cookie: alice });

    assert.equal(fetched.body.desire, "normal");
    assert.equal(fetched.body.ageRating, "none");
    assert.deepEqual(fetched.body.moods, []);
    assert.deepEqual(fetched.body.quotes, []);
  });

  it("clears pages, duration and the recommendation with null", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { pages: 300, durationMinutes: 600, recommend: "yes" });

    const response = await patchBook(alice, book.id, {
      pages: null,
      durationMinutes: null,
      recommend: null,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.pages, undefined);
    assert.equal(response.body.durationMinutes, undefined);
    assert.equal(response.body.recommend, undefined);
  });

  it("rejects null for desire, age rating, moods and quotes", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    for (const field of ["desire", "ageRating", "moods", "quotes"]) {
      const response = await patchBook(alice, book.id, { [field]: null });
      assert.equal(response.status, 400, field);
    }
  });

  it("rejects pages or a duration that are not a whole number from 1 to 10,000", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    for (const value of [0, 1.5, 10001, "300"]) {
      const pages = await patchBook(alice, book.id, { pages: value });
      const duration = await patchBook(alice, book.id, { durationMinutes: value });
      assert.equal(pages.status, 400, `pages ${value}`);
      assert.equal(duration.status, 400, `durationMinutes ${value}`);
    }
    const largest = await patchBook(alice, book.id, { pages: 10000, durationMinutes: 10000 });
    assert.equal(largest.status, 200);
  });

  it("rejects an unknown recommendation, desire or age rating", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    const recommend = await patchBook(alice, book.id, { recommend: "never" });
    const desire = await patchBook(alice, book.id, { desire: "urgent" });
    const ageRating = await patchBook(alice, book.id, { ageRating: "21" });

    assert.equal(recommend.status, 400);
    assert.equal(desire.status, 400);
    assert.equal(ageRating.status, 400);
  });

  it("rejects a blank mood, one over forty characters, a repeat in another letter case and more than twelve", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);
    const thirteen = Array.from({ length: 13 }, (_, index) => `Mood ${index}`);

    for (const moods of [[" "], ["x".repeat(41)], ["Cosy", "cosy"], thirteen]) {
      const response = await patchBook(alice, book.id, { moods });
      assert.equal(response.status, 400, JSON.stringify(moods));
    }
    const twelve = await patchBook(alice, book.id, { moods: thirteen.slice(1) });
    assert.equal(twelve.status, 200);
    assert.equal(twelve.body.moods.length, 12);
  });

  it("rejects an empty or overlong quote, a page below one, an unknown quote field and more than fifty", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);
    const many = Array.from({ length: 51 }, (_, index) => ({ text: `Quote ${index}` }));

    for (const quotes of [
      [{ text: "  " }],
      [{ text: "x".repeat(2001) }],
      [{ text: "Fine", page: 0 }],
      [{ text: "Fine", chapter: 3 }],
      many,
    ]) {
      const response = await patchBook(alice, book.id, { quotes });
      assert.equal(response.status, 400, JSON.stringify(quotes).slice(0, 60));
    }
    const fifty = await patchBook(alice, book.id, { quotes: many.slice(1) });
    assert.equal(fifty.status, 200);
    assert.equal(fifty.body.quotes.length, 50);
  });

  it("replaces the quotes as a whole and empties them with an empty array", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, { quotes: [{ text: "First" }, { text: "Second" }] });

    const replaced = await patchBook(alice, book.id, { quotes: [{ text: "Third", page: 3 }] });
    const emptied = await patchBook(alice, book.id, { quotes: [] });

    assert.deepEqual(replaced.body.quotes, [{ text: "Third", page: 3 }]);
    assert.deepEqual(emptied.body.quotes, []);
  });
});

describe("the review becomes the note", () => {
  it("no longer accepts a review on create or update", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    const create = await api("/api/books", {
      method: "POST",
      cookie: alice,
      body: { title: "X", author: "Y", review: "Loved it" },
    });
    const update = await patchBook(alice, book.id, { review: "Loved it" });

    assert.equal(create.status, 400);
    assert.equal(update.status, 400);
  });

  it("shows an old review as the note when the book has no note, and never as a review", async () => {
    const alice = await signIn("alice@example.com");
    const reviewOnly = await insertOldBook(alice, { review: "Loved it" });
    const both = await insertOldBook(alice, { review: "Loved it", notes: "Lent to Kate" });

    const first = await api(`/api/books/${reviewOnly}`, { cookie: alice });
    const second = await api(`/api/books/${both}`, { cookie: alice });

    assert.equal(first.body.notes, "Loved it");
    assert.equal(second.body.notes, "Lent to Kate");
    assert.equal(first.body.review, undefined);
    assert.equal(second.body.review, undefined);
  });

  it("replaces the old review when the note is edited, so clearing the note does not bring it back", async () => {
    const alice = await signIn("alice@example.com");
    const id = await insertOldBook(alice, { review: "Loved it" });

    const edited = await patchBook(alice, id, { notes: "Loved it, lent to Kate" });
    const cleared = await patchBook(alice, id, { notes: null });

    assert.equal(edited.body.notes, "Loved it, lent to Kate");
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.notes, undefined);
  });

  it("keeps the old review when something other than the note changes", async () => {
    const alice = await signIn("alice@example.com");
    const id = await insertOldBook(alice, { review: "Loved it" });

    const response = await patchBook(alice, id, { rating: 5 });

    assert.equal(response.body.notes, "Loved it");
  });
});
