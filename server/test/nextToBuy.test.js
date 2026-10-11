const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { pickNextToBuy } = require("../services/nextToBuy");

let counter = 0;

function series(overrides = {}) {
  counter += 1;
  return {
    id: `series-${counter}`,
    title: `Series ${counter}`,
    status: "ongoing",
    createdAt: new Date(2026, 0, counter),
    ...overrides,
  };
}

function book(overrides = {}) {
  counter += 1;
  return {
    id: `book-${counter}`,
    title: `Book ${counter}`,
    ownership: "wanted",
    links: [],
    genres: [],
    tropes: [],
    createdAt: new Date(2026, 1, counter),
    ...overrides,
  };
}

function titles(items) {
  return items.map((item) => item.book.title);
}

describe("next to buy", () => {
  it("offers every wanted book of a series that you have started", () => {
    const saga = series();
    const books = [
      book({ title: "One", ownership: "owned", seriesId: saga.id, seriesNumber: 1 }),
      book({ title: "Three", seriesId: saga.id, seriesNumber: 3 }),
      book({ title: "Four", seriesId: saga.id, seriesNumber: 4 }),
    ];

    const items = pickNextToBuy({ series: [saga], books });

    assert.deepEqual(titles(items), ["Three", "Four"]);
    assert.ok(items.every((item) => item.type === "series" && item.series.id === saga.id));
  });

  it("leaves out a series of which you own nothing", () => {
    const saga = series();
    const books = [
      book({ title: "One", seriesId: saga.id, seriesNumber: 1 }),
      book({ title: "Two", seriesId: saga.id, seriesNumber: 2 }),
    ];

    assert.deepEqual(pickNextToBuy({ series: [saga], books }), []);
  });

  it("marks a wanted number below your highest owned number as a gap", () => {
    const saga = series();
    const books = [
      book({ title: "One", ownership: "owned", seriesId: saga.id, seriesNumber: 1 }),
      book({ title: "Two", seriesId: saga.id, seriesNumber: 2 }),
      book({ title: "Three", ownership: "owned", seriesId: saga.id, seriesNumber: 3 }),
      book({ title: "Four", seriesId: saga.id, seriesNumber: 4 }),
    ];

    const items = pickNextToBuy({ series: [saga], books });
    const gapOf = (title) => items.find((item) => item.book.title === title).gap;

    assert.equal(gapOf("Two"), true);
    assert.equal(gapOf("Four"), false);
  });

  it("puts gaps first, then the other series books, then standalone wishlist books", () => {
    const first = series({ title: "Alpha" });
    const second = series({ title: "Beta" });
    const books = [
      book({ title: "Alone", seriesId: undefined }),
      book({ title: "Alpha 1", ownership: "owned", seriesId: first.id, seriesNumber: 1 }),
      book({ title: "Alpha 2", seriesId: first.id, seriesNumber: 2 }),
      book({ title: "Beta 2", ownership: "owned", seriesId: second.id, seriesNumber: 2 }),
      book({ title: "Beta 1", seriesId: second.id, seriesNumber: 1 }),
      book({ title: "Beta 3", seriesId: second.id, seriesNumber: 3 }),
    ];

    const items = pickNextToBuy({ series: [first, second], books });

    assert.deepEqual(titles(items), ["Beta 1", "Alpha 2", "Beta 3", "Alone"]);
    assert.deepEqual(
      items.map((item) => item.gap),
      [true, false, false, false],
    );
  });

  it("orders series by title and a series' books by number, unnumbered ones last", () => {
    const zed = series({ title: "Zed" });
    const apple = series({ title: "Apple" });
    const books = [
      book({ title: "Zed owned", ownership: "owned", seriesId: zed.id, seriesNumber: 1 }),
      book({ title: "Zed loose", seriesId: zed.id }),
      book({ title: "Zed 5", seriesId: zed.id, seriesNumber: 5 }),
      book({ title: "Apple owned", ownership: "owned", seriesId: apple.id, seriesNumber: 1 }),
      book({ title: "Apple 2", seriesId: apple.id, seriesNumber: 2 }),
    ];

    const items = pickNextToBuy({ series: [zed, apple], books });

    assert.deepEqual(titles(items), ["Apple 2", "Zed 5", "Zed loose"]);
  });

  it("offers every wanted standalone book, newest first, and no owned one", () => {
    const books = [
      book({ title: "Older", createdAt: new Date(2026, 0, 1) }),
      book({ title: "Newer", createdAt: new Date(2026, 5, 1) }),
      book({ title: "Owned", ownership: "owned" }),
    ];

    const items = pickNextToBuy({ series: [], books });

    assert.deepEqual(titles(items), ["Newer", "Older"]);
    assert.ok(items.every((item) => item.type === "standalone"));
  });

  it("offers nothing when nothing is missing", () => {
    const saga = series();
    const books = [book({ ownership: "owned", seriesId: saga.id, seriesNumber: 1 })];

    assert.deepEqual(pickNextToBuy({ series: [saga], books }), []);
  });

  it("treats a book whose series no longer exists as standalone", () => {
    const books = [book({ title: "Orphan", seriesId: "series-that-is-gone" })];

    const items = pickNextToBuy({ series: [], books });

    assert.deepEqual(titles(items), ["Orphan"]);
    assert.equal(items[0].type, "standalone");
  });

  it("keeps only books with a link in the chosen language", () => {
    const saga = series();
    const books = [
      book({ title: "Owned", ownership: "owned", seriesId: saga.id, seriesNumber: 1 }),
      book({
        title: "Has Russian",
        seriesId: saga.id,
        seriesNumber: 2,
        links: [{ language: "ru", url: "https://shop.example/ru" }],
      }),
      book({
        title: "Ukrainian only",
        seriesId: saga.id,
        seriesNumber: 3,
        links: [{ language: "uk", url: "https://shop.example/uk" }],
      }),
      book({ title: "No link" }),
    ];

    const items = pickNextToBuy({ series: [saga], books, filters: { language: "ru" } });

    assert.deepEqual(titles(items), ["Has Russian"]);
  });

  it("filters by genre and by trope", () => {
    const books = [
      book({ title: "Fantasy", genres: ["Fantasy"], tropes: ["Fated mates"] }),
      book({ title: "Romance", genres: ["Romance"], tropes: ["Enemies to lovers"] }),
    ];

    const byGenre = pickNextToBuy({ series: [], books, filters: { genre: "Romance" } });
    const byTrope = pickNextToBuy({ series: [], books, filters: { trope: "Fated mates" } });

    assert.deepEqual(titles(byGenre), ["Romance"]);
    assert.deepEqual(titles(byTrope), ["Fantasy"]);
  });

  it("filters by series status and then leaves standalone books out", () => {
    const ongoing = series({ status: "ongoing" });
    const complete = series({ status: "complete" });
    const books = [
      book({ title: "Owned A", ownership: "owned", seriesId: ongoing.id, seriesNumber: 1 }),
      book({ title: "In ongoing", seriesId: ongoing.id, seriesNumber: 2 }),
      book({ title: "Owned B", ownership: "owned", seriesId: complete.id, seriesNumber: 1 }),
      book({ title: "In complete", seriesId: complete.id, seriesNumber: 2 }),
      book({ title: "Alone" }),
    ];

    const items = pickNextToBuy({
      series: [ongoing, complete],
      books,
      filters: { seriesStatus: "complete" },
    });

    assert.deepEqual(titles(items), ["In complete"]);
  });
});
