require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Series = require("../models/series");
const { useTestApp } = require("./helpers/app");

const { api, signIn, userIdOf, addBook, addSeries } = useTestApp();

function patchSeries(cookie, id, body) {
  return api(`/api/series/${id}`, { method: "PATCH", cookie, body });
}

describe("series details", () => {
  it("stores an age rating, a desire level and the books expected next", async () => {
    const alice = await signIn("alice@example.com");
    const expected = [
      { number: 4, expectedYear: 2027, source: "fantlab" },
      { number: 5, source: "manual" },
    ];

    const series = await addSeries(alice, { ageRating: "18", desire: "someday", expected });
    const fetched = await api(`/api/series/${series.id}`, { cookie: alice });

    assert.equal(fetched.body.series.ageRating, "18");
    assert.equal(fetched.body.series.desire, "someday");
    assert.deepEqual(fetched.body.series.expected, expected);
  });

  it("gives a new series no age rating, normal desire and nothing expected", async () => {
    const alice = await signIn("alice@example.com");

    const series = await addSeries(alice);

    assert.equal(series.ageRating, "none");
    assert.equal(series.desire, "normal");
    assert.deepEqual(series.expected, []);
  });

  it("reads a series saved before these fields existed with the same defaults", async () => {
    const alice = await signIn("alice@example.com");
    const userId = await userIdOf(alice);
    const { insertedId } = await Series.collection.insertOne({
      userId: new Series.base.Types.ObjectId(userId),
      title: "Old series",
      tagsMerged: true,
    });

    const listed = await api("/api/series", { cookie: alice });
    const old = listed.body.series.find((item) => item.id === String(insertedId));

    assert.equal(old.ageRating, "none");
    assert.equal(old.desire, "normal");
    assert.deepEqual(old.expected, []);
  });

  it("changes the age rating, desire and expected books, and empties the list with an empty array", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice, { expected: [{ number: 3, source: "ai" }] });

    const changed = await patchSeries(alice, series.id, {
      ageRating: "12",
      desire: "high",
      expected: [{ number: 4, expectedYear: 2028, source: "manual" }],
    });
    const emptied = await patchSeries(alice, series.id, { expected: [] });

    assert.equal(changed.body.ageRating, "12");
    assert.equal(changed.body.desire, "high");
    assert.deepEqual(changed.body.expected, [{ number: 4, expectedYear: 2028, source: "manual" }]);
    assert.deepEqual(emptied.body.expected, []);
  });

  it("rejects an unknown age rating or desire, and null for either", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice);

    for (const body of [
      { ageRating: "21" },
      { desire: "urgent" },
      { ageRating: null },
      { desire: null },
    ]) {
      const response = await patchSeries(alice, series.id, body);
      assert.equal(response.status, 400, JSON.stringify(body));
    }
  });

  it("rejects an expected book with no source, an unknown source, a bad number or year, a repeated number, an unknown field or more than fifty", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice);
    const many = Array.from({ length: 51 }, (_, index) => ({ number: index + 1, source: "ai" }));

    for (const expected of [
      [{ number: 4 }],
      [{ number: 4, source: "goodreads" }],
      [{ number: 0, source: "ai" }],
      [{ number: 4, expectedYear: 2027.5, source: "ai" }],
      [{ number: 4, expectedYear: 1899, source: "ai" }],
      [
        { number: 4, source: "ai" },
        { number: 4, source: "manual" },
      ],
      [{ number: 4, source: "ai", title: "Book four" }],
      many,
    ]) {
      const response = await patchSeries(alice, series.id, { expected });
      assert.equal(response.status, 400, JSON.stringify(expected).slice(0, 80));
    }
    const fifty = await patchSeries(alice, series.id, { expected: many.slice(1) });
    assert.equal(fifty.status, 200);
  });

  it("gives a book of a series the age rating of the series, and its own back when it leaves", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice, { ageRating: "18" });
    const book = await addBook(alice, { seriesId: series.id, seriesNumber: 1, ageRating: "12" });

    const inSeries = await api(`/api/books/${book.id}`, { cookie: alice });
    const left = await api(`/api/books/${book.id}`, {
      method: "PATCH",
      cookie: alice,
      body: { seriesId: null },
    });

    assert.equal(book.ageRating, "18");
    assert.equal(inSeries.body.ageRating, "18");
    assert.equal(left.body.ageRating, "12");
  });
});
