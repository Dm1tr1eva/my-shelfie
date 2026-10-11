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
    priority: false,
    createdAt: new Date(2026, 0, counter),
    ...overrides,
  };
}

function book(overrides = {}) {
  counter += 1;
  return {
    id: `book-${counter}`,
    title: `Book ${counter}`,
    links: [],
    genres: [],
    tropes: [],
    priority: false,
    createdAt: new Date(2026, 1, counter),
    ...overrides,
  };
}

function titles(items) {
  return items.map((item) => item.book.title);
}

describe("next to buy", () => {
  it("offers the lowest-numbered wanted book of each series", () => {
    const saga = series();
    const wanted = [
      book({ title: "Four", seriesId: saga.id, seriesNumber: 4 }),
      book({ title: "Three", seriesId: saga.id, seriesNumber: 3 }),
      book({ title: "Six", seriesId: saga.id, seriesNumber: 6 }),
    ];

    const items = pickNextToBuy({ series: [saga], wantedBooks: wanted });

    assert.deepEqual(titles(items), ["Three"]);
    assert.equal(items[0].type, "series");
    assert.equal(items[0].series.id, saga.id);
  });

  it("says how many books of the series are wanted", () => {
    const saga = series();
    const wanted = [
      book({ seriesId: saga.id, seriesNumber: 2 }),
      book({ seriesId: saga.id, seriesNumber: 3 }),
    ];

    const [item] = pickNextToBuy({ series: [saga], wantedBooks: wanted });

    assert.equal(item.wantedCount, 2);
  });

  it("puts a book with no number after the numbered ones", () => {
    const saga = series();
    const wanted = [
      book({ title: "Unnumbered", seriesId: saga.id }),
      book({ title: "Number five", seriesId: saga.id, seriesNumber: 5 }),
    ];

    const items = pickNextToBuy({ series: [saga], wantedBooks: wanted });

    assert.deepEqual(titles(items), ["Number five"]);
  });

  it("offers every wanted standalone book", () => {
    const wanted = [book({ title: "Alone" }), book({ title: "Also alone" })];

    const items = pickNextToBuy({ series: [], wantedBooks: wanted });

    assert.deepEqual(titles(items).sort(), ["Alone", "Also alone"]);
    assert.ok(items.every((item) => item.type === "standalone"));
  });

  it("offers nothing when nothing is wanted", () => {
    assert.deepEqual(pickNextToBuy({ series: [series()], wantedBooks: [] }), []);
  });

  it("lists starred items first and the rest by most recently added", () => {
    const older = series({ createdAt: new Date(2026, 0, 1) });
    const newer = series({ createdAt: new Date(2026, 0, 20) });
    const starred = series({ createdAt: new Date(2026, 0, 5), priority: true });
    const wanted = [
      book({ title: "Older", seriesId: older.id, seriesNumber: 1 }),
      book({ title: "Newer", seriesId: newer.id, seriesNumber: 1 }),
      book({ title: "Starred", seriesId: starred.id, seriesNumber: 1 }),
      book({ title: "Starred alone", priority: true, createdAt: new Date(2026, 0, 2) }),
    ];

    const items = pickNextToBuy({ series: [older, newer, starred], wantedBooks: wanted });

    assert.deepEqual(titles(items), ["Starred", "Starred alone", "Newer", "Older"]);
  });

  it("keeps only items whose next book has a link in the chosen language", () => {
    const first = series();
    const second = series();
    const wanted = [
      book({
        title: "Has Russian",
        seriesId: first.id,
        seriesNumber: 1,
        links: [{ language: "ru", url: "https://shop.example/ru" }],
      }),
      book({
        title: "Ukrainian only",
        seriesId: second.id,
        seriesNumber: 1,
        links: [{ language: "uk", url: "https://shop.example/uk" }],
      }),
      book({ title: "No link" }),
    ];

    const items = pickNextToBuy({
      series: [first, second],
      wantedBooks: wanted,
      filters: { language: "ru" },
    });

    assert.deepEqual(titles(items), ["Has Russian"]);
  });

  it("filters by genre and by trope", () => {
    const wanted = [
      book({ title: "Fantasy", genres: ["Fantasy"], tropes: ["Fated mates"] }),
      book({ title: "Romance", genres: ["Romance"], tropes: ["Enemies to lovers"] }),
    ];

    const byGenre = pickNextToBuy({
      series: [],
      wantedBooks: wanted,
      filters: { genre: "Romance" },
    });
    const byTrope = pickNextToBuy({
      series: [],
      wantedBooks: wanted,
      filters: { trope: "Fated mates" },
    });

    assert.deepEqual(titles(byGenre), ["Romance"]);
    assert.deepEqual(titles(byTrope), ["Fantasy"]);
  });

  it("filters by series status and then leaves standalone books out", () => {
    const ongoing = series({ status: "ongoing" });
    const complete = series({ status: "complete" });
    const wanted = [
      book({ title: "In ongoing", seriesId: ongoing.id, seriesNumber: 1 }),
      book({ title: "In complete", seriesId: complete.id, seriesNumber: 1 }),
      book({ title: "Alone" }),
    ];

    const items = pickNextToBuy({
      series: [ongoing, complete],
      wantedBooks: wanted,
      filters: { seriesStatus: "complete" },
    });

    assert.deepEqual(titles(items), ["In complete"]);
  });

  it("applies the filters to the next book, so a series can drop out of the list", () => {
    const saga = series();
    const wanted = [
      book({ title: "Next, no link", seriesId: saga.id, seriesNumber: 1 }),
      book({
        title: "Later, has link",
        seriesId: saga.id,
        seriesNumber: 2,
        links: [{ language: "ru", url: "https://shop.example/ru" }],
      }),
    ];

    const items = pickNextToBuy({
      series: [saga],
      wantedBooks: wanted,
      filters: { language: "ru" },
    });

    assert.deepEqual(items, []);
  });
});
