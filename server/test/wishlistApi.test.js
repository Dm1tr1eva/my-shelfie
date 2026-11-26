require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Book = require("../models/book");
const Series = require("../models/series");
const { useTestApp } = require("./helpers/app");

const { api, signIn, userIdOf, addBook, addSeries } = useTestApp();

function wishlistOf(cookie, query = "") {
  return api(`/api/wishlist${query}`, { cookie });
}

function itemsIn(response, key) {
  return response.body.groups.find((group) => group.key === key).items;
}

function titlesIn(response, key) {
  return itemsIn(response, key).map((item) => item.title);
}

describe("GET /api/wishlist", () => {
  it("answers 401 without a session", async () => {
    const response = await wishlistOf(undefined);

    assert.equal(response.status, 401);
  });

  it("answers three empty groups for a user who wants nothing", async () => {
    const alice = await signIn("alice@example.com");
    await addBook(alice, { title: "Owned and alone" });

    const response = await wishlistOf(alice);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      groups: [
        { key: "continue", count: 0, items: [] },
        { key: "newSeries", count: 0, items: [] },
        { key: "standalone", count: 0, items: [] },
      ],
    });
  });

  it("groups the shelf into series to continue, new series and standalone books", async () => {
    const alice = await signIn("alice@example.com");
    const started = await addSeries(alice, { title: "Started", totalBooks: 3, desire: "high" });
    const untouched = await addSeries(alice, { title: "Untouched" });
    await addBook(alice, {
      title: "Started 1",
      seriesId: started.id,
      seriesNumber: 1,
      coverUrl: "https://covers.example/s1.jpg",
    });
    await addBook(alice, {
      title: "Started 2",
      seriesId: started.id,
      seriesNumber: 2,
      ownership: "wanted",
    });
    await addBook(alice, {
      title: "Untouched 1",
      seriesId: untouched.id,
      seriesNumber: 1,
      ownership: "wanted",
    });
    const loose = await addBook(alice, {
      title: "Loose",
      author: "Someone",
      ownership: "wanted",
      desire: "someday",
    });

    const response = await wishlistOf(alice);

    assert.equal(response.status, 200);
    assert.deepEqual(itemsIn(response, "continue"), [
      {
        type: "series",
        id: started.id,
        title: "Started",
        author: "An author",
        status: "unknown",
        desire: "high",
        coverUrl: "https://covers.example/s1.jpg",
        segments: [
          { number: 1, state: "owned" },
          { number: 2, state: "wanted" },
          { number: 3, state: "missing" },
        ],
        genres: [],
        tropes: [],
        linkLanguages: [],
        linkKinds: [],
      },
    ]);
    assert.deepEqual(titlesIn(response, "newSeries"), ["Untouched"]);
    assert.deepEqual(itemsIn(response, "standalone"), [
      {
        type: "book",
        id: loose.id,
        title: "Loose",
        author: "Someone",
        desire: "someday",
        format: "paper",
        genres: [],
        tropes: [],
        linkLanguages: [],
        linkKinds: [],
      },
    ]);
    assert.deepEqual(
      response.body.groups.map((group) => group.count),
      [1, 1, 1],
    );
  });

  it("never shows another user's books or series", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const bobsSeries = await addSeries(bob, { title: "Bob's series" });
    await addBook(bob, { title: "Bob's owned", seriesId: bobsSeries.id, seriesNumber: 1 });
    await addBook(bob, {
      title: "Bob's wanted",
      seriesId: bobsSeries.id,
      seriesNumber: 2,
      ownership: "wanted",
    });
    await addBook(bob, { title: "Bob's loose", ownership: "wanted" });
    await addSeries(bob, { title: "Bob's new series" });
    await addBook(alice, { title: "Alice's loose", ownership: "wanted" });

    const response = await wishlistOf(alice);

    assert.equal(response.status, 200);
    assert.deepEqual(titlesIn(response, "continue"), []);
    assert.deepEqual(titlesIn(response, "newSeries"), []);
    assert.deepEqual(titlesIn(response, "standalone"), ["Alice's loose"]);
  });

  it("does not let another user's owned book start your series", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const alicesSeries = await addSeries(alice, { title: "Alice's series" });
    await addBook(alice, {
      title: "Alice's wanted",
      seriesId: alicesSeries.id,
      seriesNumber: 2,
      ownership: "wanted",
    });
    await Book.collection.insertOne({
      userId: new Book.base.Types.ObjectId(await userIdOf(bob)),
      title: "Bob's book in Alice's series",
      author: "Bob",
      seriesId: new Book.base.Types.ObjectId(alicesSeries.id),
      seriesNumber: 1,
    });

    const response = await wishlistOf(alice);

    assert.deepEqual(titlesIn(response, "newSeries"), ["Alice's series"]);
    assert.deepEqual(titlesIn(response, "continue"), []);
  });

  it("reads books and series saved before desire existed as normal", async () => {
    const alice = await signIn("alice@example.com");
    const userId = new Book.base.Types.ObjectId(await userIdOf(alice));
    await addBook(alice, { title: "Keen", ownership: "wanted", desire: "high" });
    await addBook(alice, { title: "Later", ownership: "wanted", desire: "someday" });
    await Book.collection.insertOne({
      userId,
      title: "Old wanted",
      author: "Someone",
      ownership: "wanted",
      createdAt: new Date(2020, 0, 1),
    });
    await Series.collection.insertOne({ userId, title: "Old series", tagsMerged: true });

    const response = await wishlistOf(alice);

    assert.equal(response.status, 200);
    assert.deepEqual(titlesIn(response, "standalone"), ["Keen", "Old wanted", "Later"]);
    assert.equal(itemsIn(response, "standalone")[1].desire, "normal");
    assert.equal(itemsIn(response, "newSeries")[0].desire, "normal");
  });

  it("moves a series when its desire level changes through the series endpoint", async () => {
    const alice = await signIn("alice@example.com");
    const first = await addSeries(alice, { title: "A first" });
    const second = await addSeries(alice, { title: "B second" });

    const before = await wishlistOf(alice);
    const patched = await api(`/api/series/${second.id}`, {
      method: "PATCH",
      cookie: alice,
      body: { desire: "high" },
    });
    const after = await wishlistOf(alice);

    assert.equal(patched.status, 200);
    assert.deepEqual(
      itemsIn(before, "newSeries").map((item) => item.id),
      [first.id, second.id],
    );
    assert.deepEqual(
      itemsIn(after, "newSeries").map((item) => item.id),
      [second.id, first.id],
    );
  });

  it("rejects a query parameter", async () => {
    const alice = await signIn("alice@example.com");

    const response = await wishlistOf(alice, "?q=dune");

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'query: Unrecognized key: "q"' });
  });
});
