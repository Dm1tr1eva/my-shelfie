const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { buildWishlist } = require("../services/wishlist");

let counter = 0;

function series(overrides = {}) {
  counter += 1;
  return {
    id: `series-${String(counter).padStart(3, "0")}`,
    title: `Series ${counter}`,
    status: "ongoing",
    desire: "normal",
    genres: [],
    tropes: [],
    expected: [],
    createdAt: new Date(2026, 0, counter),
    ...overrides,
  };
}

function book(overrides = {}) {
  counter += 1;
  return {
    id: `book-${String(counter).padStart(3, "0")}`,
    title: `Book ${counter}`,
    author: "An author",
    ownership: "wanted",
    format: "paper",
    desire: "normal",
    links: [],
    genres: [],
    tropes: [],
    createdAt: new Date(2026, 1, counter),
    ...overrides,
  };
}

function owned(of, number, overrides = {}) {
  return book({ ownership: "owned", seriesId: of.id, seriesNumber: number, ...overrides });
}

function wanted(of, number, overrides = {}) {
  return book({ seriesId: of.id, seriesNumber: number, ...overrides });
}

function groupOf(groups, key) {
  return groups.find((item) => item.key === key);
}

function titlesIn(groups, key) {
  return groupOf(groups, key).items.map((item) => item.title);
}

function rowOf(groups, id) {
  return groups.flatMap((item) => item.items).find((item) => item.id === id);
}

function statesOf(row) {
  return row.segments.map(({ number, state }) => [number, state]);
}

describe("wishlist groups", () => {
  it("answers three empty groups in a fixed order when nothing is wanted", () => {
    const groups = buildWishlist({ series: [], books: [] });

    assert.deepEqual(groups, [
      { key: "continue", count: 0, items: [] },
      { key: "newSeries", count: 0, items: [] },
      { key: "standalone", count: 0, items: [] },
    ]);
  });

  it("puts a started series with a wanted book under Continue a series", () => {
    const saga = series({ title: "Saga" });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1), wanted(saga, 2)] });

    assert.deepEqual(titlesIn(groups, "continue"), ["Saga"]);
    assert.equal(groupOf(groups, "continue").count, 1);
    assert.deepEqual(titlesIn(groups, "newSeries"), []);
  });

  it("continues a series whose only missing numbers come from its size", () => {
    const saga = series({ title: "Saga", totalBooks: 3 });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1), owned(saga, 2)] });

    assert.deepEqual(titlesIn(groups, "continue"), ["Saga"]);
    assert.deepEqual(statesOf(rowOf(groups, saga.id)), [
      [1, "owned"],
      [2, "owned"],
      [3, "missing"],
    ]);
  });

  it("continues a series whose only missing number is an expected one", () => {
    const saga = series({ title: "Saga", expected: [{ number: 3, source: "fantlab" }] });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1), owned(saga, 2)] });

    assert.deepEqual(titlesIn(groups, "continue"), ["Saga"]);
    assert.deepEqual(statesOf(rowOf(groups, saga.id)).at(-1), [3, "missing"]);
  });

  it("continues a series with a hole below the highest number you own", () => {
    const saga = series({ title: "Saga" });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1), owned(saga, 3)] });

    assert.deepEqual(statesOf(rowOf(groups, saga.id)), [
      [1, "owned"],
      [2, "missing"],
      [3, "owned"],
    ]);
    assert.deepEqual(titlesIn(groups, "continue"), ["Saga"]);
  });

  it("leaves out a series you own every book of", () => {
    const saga = series({ totalBooks: 2 });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1), owned(saga, 2)] });

    assert.equal(rowOf(groups, saga.id), undefined);
  });

  it("continues a fully numbered series that still has a wanted book without a number", () => {
    const saga = series({ title: "Saga", totalBooks: 1 });

    const groups = buildWishlist({
      series: [saga],
      books: [owned(saga, 1), wanted(saga, undefined)],
    });

    assert.deepEqual(titlesIn(groups, "continue"), ["Saga"]);
  });

  it("puts a series you own nothing of under New series, with or without books", () => {
    const wantedOnly = series({ title: "Wanted only" });
    const empty = series({ title: "Empty" });

    const groups = buildWishlist({ series: [wantedOnly, empty], books: [wanted(wantedOnly, 1)] });

    assert.deepEqual(titlesIn(groups, "newSeries"), ["Empty", "Wanted only"]);
    assert.deepEqual(rowOf(groups, empty.id).segments, []);
    assert.deepEqual(titlesIn(groups, "continue"), []);
  });

  it("lists wanted books without a series, or whose series is gone, as standalone", () => {
    const loose = book({ title: "Loose" });
    const orphan = book({ title: "Orphan", seriesId: "series-gone", seriesNumber: 2 });
    const ownedLoose = book({ title: "Owned loose", ownership: "owned" });

    const groups = buildWishlist({ series: [], books: [loose, orphan, ownedLoose] });

    assert.deepEqual(titlesIn(groups, "standalone"), ["Orphan", "Loose"]);
    assert.equal(groupOf(groups, "standalone").count, 2);
  });

  it("never lists a wanted book of a series as standalone", () => {
    const saga = series();

    const groups = buildWishlist({ series: [saga], books: [wanted(saga, 1)] });

    assert.deepEqual(titlesIn(groups, "standalone"), []);
  });
});

describe("wishlist order", () => {
  it("sorts series by their own desire level, then by title", () => {
    const later = series({ title: "A later one", desire: "someday" });
    const keen = series({ title: "Z keen", desire: "high" });
    const plainB = series({ title: "B plain" });
    const plainA = series({ title: "A plain" });
    const books = [later, keen, plainB, plainA].flatMap((item) => [
      owned(item, 1),
      wanted(item, 2, { desire: "high" }),
    ]);

    const groups = buildWishlist({ series: [later, keen, plainB, plainA], books });

    assert.deepEqual(titlesIn(groups, "continue"), ["Z keen", "A plain", "B plain", "A later one"]);
  });

  it("sorts new series by desire level too", () => {
    const later = series({ title: "A", desire: "someday" });
    const keen = series({ title: "B", desire: "high" });

    const groups = buildWishlist({ series: [later, keen], books: [] });

    assert.deepEqual(titlesIn(groups, "newSeries"), ["B", "A"]);
  });

  it("breaks a tie of desire and title by id", () => {
    const second = series({ id: "series-b", title: "Twin" });
    const first = series({ id: "series-a", title: "Twin" });

    const groups = buildWishlist({ series: [second, first], books: [] });

    assert.deepEqual(
      groupOf(groups, "newSeries").items.map((item) => item.id),
      ["series-a", "series-b"],
    );
  });

  it("sorts standalone books by their desire level, then newest first, then by id", () => {
    const old = book({ title: "Old", createdAt: new Date(2026, 0, 1) });
    const recent = book({ title: "Recent", createdAt: new Date(2026, 5, 1) });
    const keen = book({ title: "Keen", desire: "high", createdAt: new Date(2025, 0, 1) });
    const later = book({ title: "Later", desire: "someday", createdAt: new Date(2027, 0, 1) });
    const twinB = book({ id: "book-twin-b", title: "Twin B", createdAt: new Date(2026, 3, 1) });
    const twinA = book({ id: "book-twin-a", title: "Twin A", createdAt: new Date(2026, 3, 1) });

    const groups = buildWishlist({ series: [], books: [old, later, twinB, recent, keen, twinA] });

    assert.deepEqual(titlesIn(groups, "standalone"), [
      "Keen",
      "Recent",
      "Twin A",
      "Twin B",
      "Old",
      "Later",
    ]);
  });
});

describe("wishlist segments", () => {
  it("gives one segment per number, owned winning over wanted, and fills up to the size", () => {
    const saga = series({ totalBooks: 5 });
    const books = [
      wanted(saga, 2),
      owned(saga, 2),
      owned(saga, 4),
      wanted(saga, 4),
      wanted(saga, 3),
      owned(saga, 1),
      wanted(saga, 2.5),
    ];

    const groups = buildWishlist({ series: [saga], books });

    assert.deepEqual(statesOf(rowOf(groups, saga.id)), [
      [1, "owned"],
      [2, "owned"],
      [2.5, "wanted"],
      [3, "wanted"],
      [4, "owned"],
      [5, "missing"],
    ]);
  });

  it("orders the segments numerically past nine, not as text", () => {
    const saga = series({ totalBooks: 12 });

    const groups = buildWishlist({
      series: [saga],
      books: [owned(saga, 10), owned(saga, 2), wanted(saga, 11.5)],
    });

    assert.deepEqual(
      rowOf(groups, saga.id).segments.map((segment) => segment.number),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11.5, 12],
    );
  });

  it("fills up to the highest expected number when it is above the size", () => {
    const saga = series({ totalBooks: 2, expected: [{ number: 4, source: "ai" }] });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1)] });

    assert.deepEqual(
      rowOf(groups, saga.id).segments.map((segment) => segment.number),
      [1, 2, 3, 4],
    );
  });

  it("fills gaps no further than 999, so a huge number stays a single segment", () => {
    const saga = series({ expected: [{ number: 5e6, source: "ai" }] });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1), wanted(saga, 1e7)] });
    const segments = rowOf(groups, saga.id).segments;

    assert.equal(segments.length, 1001);
    assert.deepEqual(segments.slice(-3), [
      { number: 999, state: "missing" },
      { number: 5e6, state: "missing" },
      { number: 1e7, state: "wanted" },
    ]);
  });

  it("draws an expected number that already has a book in that book's state", () => {
    const saga = series({ expected: [{ number: 2, source: "manual" }] });

    const groups = buildWishlist({ series: [saga], books: [owned(saga, 1), wanted(saga, 2)] });

    assert.deepEqual(statesOf(rowOf(groups, saga.id)), [
      [1, "owned"],
      [2, "wanted"],
    ]);
  });

  it("puts books without a number after the numbered ones, oldest first", () => {
    const saga = series();
    const books = [
      book({ seriesId: saga.id, createdAt: new Date(2026, 4, 1) }),
      book({ seriesId: saga.id, ownership: "owned", createdAt: new Date(2026, 2, 1) }),
      owned(saga, 1),
    ];

    const groups = buildWishlist({ series: [saga], books });

    assert.deepEqual(statesOf(rowOf(groups, saga.id)), [
      [1, "owned"],
      [null, "owned"],
      [null, "wanted"],
    ]);
  });
});

describe("wishlist rows", () => {
  it("describes a series row with its cover, desire and the values the filters need", () => {
    const saga = series({
      title: "Saga",
      author: "Writer",
      status: "complete",
      desire: "high",
      genres: ["Fantasy"],
      tropes: ["Found family"],
    });
    const books = [
      owned(saga, 1, { links: [{ kind: "paper", languages: ["ru"], url: "https://a.example" }] }),
      wanted(saga, 3, {
        coverUrl: "https://covers.example/3.jpg",
        links: [
          { kind: "ebook", languages: ["uk", "en"], url: "https://b.example" },
          { kind: "ebook", languages: ["uk"], url: "https://c.example" },
        ],
      }),
      wanted(saga, 2, { coverUrl: "https://covers.example/2.jpg" }),
    ];

    const groups = buildWishlist({ series: [saga], books });

    assert.deepEqual(rowOf(groups, saga.id), {
      type: "series",
      id: saga.id,
      title: "Saga",
      author: "Writer",
      status: "complete",
      desire: "high",
      coverUrl: "https://covers.example/2.jpg",
      segments: [
        { number: 1, state: "owned" },
        { number: 2, state: "wanted" },
        { number: 3, state: "wanted" },
      ],
      genres: ["Fantasy"],
      tropes: ["Found family"],
      linkLanguages: ["uk", "en"],
      linkKinds: ["ebook"],
    });
  });

  it("takes a series cover from an owned book too, and leaves it out when no book has one", () => {
    const covered = series();
    const bare = series();
    const books = [
      owned(covered, 1, { coverUrl: "https://covers.example/1.jpg" }),
      book({ seriesId: covered.id, coverUrl: "https://covers.example/unnumbered.jpg" }),
      wanted(bare, 1),
    ];

    const groups = buildWishlist({ series: [covered, bare], books });

    assert.equal(rowOf(groups, covered.id).coverUrl, "https://covers.example/1.jpg");
    assert.equal("coverUrl" in rowOf(groups, bare.id), false);
    assert.equal("author" in rowOf(groups, bare.id), false);
  });

  it("describes a standalone book row with exactly what the page draws and filters on", () => {
    const loose = book({
      title: "Loose",
      author: "Someone",
      desire: "someday",
      format: "audio",
      coverUrl: "https://covers.example/loose.jpg",
      genres: ["Horror"],
      tropes: ["Haunted house"],
      links: [{ kind: "audio", languages: ["en"], url: "https://d.example" }],
      notes: "private",
      status: "read",
      rating: 5,
    });

    const groups = buildWishlist({ series: [], books: [loose] });

    assert.deepEqual(rowOf(groups, loose.id), {
      type: "book",
      id: loose.id,
      title: "Loose",
      author: "Someone",
      desire: "someday",
      coverUrl: "https://covers.example/loose.jpg",
      format: "audio",
      genres: ["Horror"],
      tropes: ["Haunted house"],
      linkLanguages: ["en"],
      linkKinds: ["audio"],
    });
  });
});
