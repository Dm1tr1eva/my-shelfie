require("dotenv").config({ quiet: true });

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../app");
const Book = require("../models/book");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./helpers/db");

const PASSWORD = "secret123";

let server;
let baseUrl;

before(async () => {
  await connectTestDb();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

async function api(path, { method = "GET", body, cookie } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    setCookie: response.headers.getSetCookie(),
  };
}

async function signIn(email) {
  await api("/api/auth/register", {
    method: "POST",
    body: { email, password: PASSWORD, name: email },
  });

  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD },
  });

  assert.equal(login.status, 200, `login failed for ${email}`);
  return login.setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function addSeries(cookie, overrides = {}) {
  const created = await api("/api/series", {
    method: "POST",
    cookie,
    body: { title: "From Blood and Ash", author: "Jennifer L. Armentrout", ...overrides },
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body;
}

async function addBook(cookie, overrides = {}) {
  const created = await api("/api/books", {
    method: "POST",
    cookie,
    body: { title: "A book", author: "An author", ...overrides },
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body;
}

describe("series API", () => {
  it("refuses a request with no session cookie", async () => {
    const response = await api("/api/series");

    assert.equal(response.status, 401);
  });

  it("creates a series with an unknown status and no priority by default", async () => {
    const alice = await signIn("alice@example.com");

    const series = await addSeries(alice);

    assert.equal(series.title, "From Blood and Ash");
    assert.equal(series.status, "unknown");
    assert.equal(series.priority, false);
    assert.equal(series.ownedCount, 0);
    assert.equal(series.wantedCount, 0);
    assert.equal(series.userId, undefined);
  });

  it("rejects an empty title, an unknown status and an unknown field", async () => {
    const alice = await signIn("alice@example.com");

    const noTitle = await api("/api/series", {
      method: "POST",
      cookie: alice,
      body: { title: " " },
    });
    const badStatus = await api("/api/series", {
      method: "POST",
      cookie: alice,
      body: { title: "X", status: "finished" },
    });
    const extra = await api("/api/series", {
      method: "POST",
      cookie: alice,
      body: { title: "X", userId: "000000000000000000000000" },
    });

    assert.equal(noTitle.status, 400);
    assert.equal(badStatus.status, 400);
    assert.equal(extra.status, 400);
  });

  it("lists only the caller's series with how many books are owned and wanted", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const mine = await addSeries(alice, { title: "Mine" });
    await addSeries(bob, { title: "Bob's" });
    await addBook(alice, { seriesId: mine.id, seriesNumber: 1, ownership: "owned" });
    await addBook(alice, { seriesId: mine.id, seriesNumber: 2, ownership: "owned" });
    await addBook(alice, { seriesId: mine.id, seriesNumber: 3, ownership: "wanted" });

    const response = await api("/api/series", { cookie: alice });

    assert.equal(response.status, 200);
    assert.equal(response.body.series.length, 1);
    assert.equal(response.body.series[0].title, "Mine");
    assert.equal(response.body.series[0].ownedCount, 2);
    assert.equal(response.body.series[0].wantedCount, 1);
  });

  it("returns a series with its books in order, unnumbered ones last", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice);
    await addBook(alice, { title: "Two", seriesId: series.id, seriesNumber: 2 });
    await addBook(alice, { title: "Loose", seriesId: series.id });
    await addBook(alice, { title: "One", seriesId: series.id, seriesNumber: 1 });

    const response = await api(`/api/series/${series.id}`, { cookie: alice });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.books.map((book) => book.title),
      ["One", "Two", "Loose"],
    );
    assert.equal(response.body.series.ownedCount, 3);
  });

  it("hides another user's series behind a 404 for every method", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const series = await addSeries(alice);

    const read = await api(`/api/series/${series.id}`, { cookie: bob });
    const update = await api(`/api/series/${series.id}`, {
      method: "PATCH",
      cookie: bob,
      body: { title: "Mine now" },
    });
    const remove = await api(`/api/series/${series.id}`, { method: "DELETE", cookie: bob });
    const stillThere = await api(`/api/series/${series.id}`, { cookie: alice });

    assert.equal(read.status, 404);
    assert.equal(update.status, 404);
    assert.equal(remove.status, 404);
    assert.equal(stillThere.body.series.title, "From Blood and Ash");
  });

  it("answers 404 rather than 500 for a malformed series id", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/series/not-an-id", { cookie: alice });

    assert.equal(response.status, 404);
  });

  it("updates a series and clears its note with null", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice, { note: "book 7 is delayed" });

    const updated = await api(`/api/series/${series.id}`, {
      method: "PATCH",
      cookie: alice,
      body: { status: "ongoing", priority: true, note: null },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, "ongoing");
    assert.equal(updated.body.priority, true);
    assert.equal(updated.body.note, undefined);
  });

  it("keeps the books of a deleted series and makes them standalone", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice);
    const book = await addBook(alice, { seriesId: series.id, seriesNumber: 1 });

    const removed = await api(`/api/series/${series.id}`, { method: "DELETE", cookie: alice });
    const after = await api(`/api/books/${book.id}`, { cookie: alice });

    assert.equal(removed.status, 204);
    assert.equal(after.status, 200);
    assert.equal(after.body.seriesId, undefined);
    assert.equal(after.body.seriesNumber, undefined);
  });
});

describe("library fields on books", () => {
  it("stores ownership, series, genres, tropes, links, notes, annotation and priority", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice);

    const book = await addBook(alice, {
      ownership: "wanted",
      seriesId: series.id,
      seriesNumber: 2,
      genres: ["Fantasy", "Romantasy"],
      tropes: ["Enemies to lovers"],
      links: [{ language: "ru", url: "https://shop.example/ru/book" }],
      notes: "wait for the sale",
      annotation: "my own words",
      priority: true,
    });
    const fetched = await api(`/api/books/${book.id}`, { cookie: alice });

    assert.equal(fetched.body.ownership, "wanted");
    assert.equal(fetched.body.seriesId, series.id);
    assert.equal(fetched.body.seriesNumber, 2);
    assert.deepEqual(fetched.body.genres, ["Fantasy", "Romantasy"]);
    assert.deepEqual(fetched.body.tropes, ["Enemies to lovers"]);
    assert.deepEqual(fetched.body.links, [{ language: "ru", url: "https://shop.example/ru/book" }]);
    assert.equal(fetched.body.notes, "wait for the sale");
    assert.equal(fetched.body.annotation, "my own words");
    assert.equal(fetched.body.priority, true);
  });

  it("makes a new book owned, standalone and untagged unless told otherwise", async () => {
    const alice = await signIn("alice@example.com");

    const book = await addBook(alice);

    assert.equal(book.ownership, "owned");
    assert.equal(book.seriesId, undefined);
    assert.deepEqual(book.genres, []);
    assert.deepEqual(book.tropes, []);
    assert.deepEqual(book.links, []);
    assert.equal(book.priority, false);
  });

  it("rejects a book that points at another user's series", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const bobsSeries = await addSeries(bob);

    const response = await api("/api/books", {
      method: "POST",
      cookie: alice,
      body: { title: "X", author: "Y", seriesId: bobsSeries.id, seriesNumber: 1 },
    });

    assert.equal(response.status, 400);
  });

  it("rejects moving an existing book into another user's series", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const bobsSeries = await addSeries(bob);
    const book = await addBook(alice);

    const response = await api(`/api/books/${book.id}`, {
      method: "PATCH",
      cookie: alice,
      body: { seriesId: bobsSeries.id },
    });

    assert.equal(response.status, 400);
  });

  it("rejects a series number without a series", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/books", {
      method: "POST",
      cookie: alice,
      body: { title: "X", author: "Y", seriesNumber: 3 },
    });

    assert.equal(response.status, 400);
  });

  it("rejects a link that is not an http(s) address", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/books", {
      method: "POST",
      cookie: alice,
      body: {
        title: "X",
        author: "Y",
        links: [{ language: "ru", url: "javascript:alert(1)" }],
      },
    });

    assert.equal(response.status, 400);
  });

  it("rejects an unknown genre and an unknown link language", async () => {
    const alice = await signIn("alice@example.com");

    const genre = await api("/api/books", {
      method: "POST",
      cookie: alice,
      body: { title: "X", author: "Y", genres: ["Cooking"] },
    });
    const language = await api("/api/books", {
      method: "POST",
      cookie: alice,
      body: { title: "X", author: "Y", links: [{ language: "fr", url: "https://shop.example" }] },
    });

    assert.equal(genre.status, 400);
    assert.equal(language.status, 400);
  });

  it("takes a book out of its series when PATCH sends null", async () => {
    const alice = await signIn("alice@example.com");
    const series = await addSeries(alice);
    const book = await addBook(alice, { seriesId: series.id, seriesNumber: 1 });

    const response = await api(`/api/books/${book.id}`, {
      method: "PATCH",
      cookie: alice,
      body: { seriesId: null, seriesNumber: null },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.seriesId, undefined);
    assert.equal(response.body.seriesNumber, undefined);
  });

  it("empties the tags and links with an empty array", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice, {
      tropes: ["Fated mates"],
      links: [{ language: "uk", url: "https://shop.example/uk" }],
    });

    const response = await api(`/api/books/${book.id}`, {
      method: "PATCH",
      cookie: alice,
      body: { tropes: [], links: [] },
    });

    assert.deepEqual(response.body.tropes, []);
    assert.deepEqual(response.body.links, []);
  });

  it("counts a book saved before ownership existed as owned", async () => {
    const alice = await signIn("alice@example.com");
    const me = await api("/api/auth/me", { cookie: alice });
    await Book.collection.insertOne({
      userId: new Book.base.Types.ObjectId(me.body.id),
      title: "Old book",
      author: "Old author",
      status: "read",
    });

    const owned = await api("/api/books?ownership=owned", { cookie: alice });
    const wanted = await api("/api/books?ownership=wanted", { cookie: alice });

    assert.deepEqual(
      owned.body.books.map((book) => book.title),
      ["Old book"],
    );
    assert.equal(owned.body.books[0].ownership, "owned");
    assert.equal(wanted.body.books.length, 0);
  });

  it("lists by ownership, genre, trope and a text search", async () => {
    const alice = await signIn("alice@example.com");
    await addBook(alice, {
      title: "Blood and Ash",
      author: "Armentrout",
      ownership: "wanted",
      genres: ["Romantasy"],
      tropes: ["Fated mates"],
    });
    await addBook(alice, { title: "Dune", author: "Herbert", genres: ["Science fiction"] });

    const wanted = await api("/api/books?ownership=wanted", { cookie: alice });
    const genre = await api("/api/books?genre=Science%20fiction", { cookie: alice });
    const trope = await api("/api/books?trope=Fated%20mates", { cookie: alice });
    const text = await api("/api/books?q=armen", { cookie: alice });

    const titlesOf = (response) => response.body.books.map((book) => book.title);
    assert.deepEqual(titlesOf(wanted), ["Blood and Ash"]);
    assert.deepEqual(titlesOf(genre), ["Dune"]);
    assert.deepEqual(titlesOf(trope), ["Blood and Ash"]);
    assert.deepEqual(titlesOf(text), ["Blood and Ash"]);
  });

  it("treats the text search as plain text, not as a pattern", async () => {
    const alice = await signIn("alice@example.com");
    await addBook(alice, { title: "Plain title" });

    const response = await api("/api/books?q=" + encodeURIComponent(".*("), { cookie: alice });

    assert.equal(response.status, 200);
    assert.equal(response.body.books.length, 0);
  });

  it("rejects an unknown ownership or genre filter", async () => {
    const alice = await signIn("alice@example.com");

    const ownership = await api("/api/books?ownership=borrowed", { cookie: alice });
    const genre = await api("/api/books?genre=Cooking", { cookie: alice });

    assert.equal(ownership.status, 400);
    assert.equal(genre.status, 400);
  });

  it("lists the user's own tropes once each, sorted", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    await addBook(alice, { tropes: ["Slow burn", "Fated mates"] });
    await addBook(alice, { tropes: ["Fated mates", "Found family"] });
    await addBook(bob, { tropes: ["Secret baby"] });

    const response = await api("/api/tropes", { cookie: alice });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.tropes, ["Fated mates", "Found family", "Slow burn"]);
  });
});

describe("next to buy API", () => {
  it("refuses a request with no session cookie", async () => {
    const response = await api("/api/next-to-buy");

    assert.equal(response.status, 401);
  });

  it("offers the next wanted book of each series and every wanted standalone book", async () => {
    const alice = await signIn("alice@example.com");
    const saga = await addSeries(alice, { title: "Saga" });
    await addBook(alice, {
      title: "Saga 1",
      seriesId: saga.id,
      seriesNumber: 1,
      ownership: "owned",
    });
    await addBook(alice, {
      title: "Saga 3",
      seriesId: saga.id,
      seriesNumber: 3,
      ownership: "wanted",
    });
    await addBook(alice, {
      title: "Saga 2",
      seriesId: saga.id,
      seriesNumber: 2,
      ownership: "wanted",
    });
    await addBook(alice, { title: "Alone", ownership: "wanted" });
    await addBook(alice, { title: "Not wanted", ownership: "owned" });

    const response = await api("/api/next-to-buy", { cookie: alice });

    assert.equal(response.status, 200);
    const titles = response.body.items.map((item) => item.book.title).sort();
    assert.deepEqual(titles, ["Alone", "Saga 2"]);
    const sagaItem = response.body.items.find((item) => item.type === "series");
    assert.equal(sagaItem.series.title, "Saga");
    assert.equal(sagaItem.wantedCount, 2);
  });

  it("puts a starred series first", async () => {
    const alice = await signIn("alice@example.com");
    const plain = await addSeries(alice, { title: "Plain" });
    const starred = await addSeries(alice, { title: "Starred", priority: true });
    await addBook(alice, {
      title: "Plain 1",
      seriesId: plain.id,
      seriesNumber: 1,
      ownership: "wanted",
    });
    await addBook(alice, {
      title: "Starred 1",
      seriesId: starred.id,
      seriesNumber: 1,
      ownership: "wanted",
    });

    const response = await api("/api/next-to-buy", { cookie: alice });

    assert.deepEqual(
      response.body.items.map((item) => item.book.title),
      ["Starred 1", "Plain 1"],
    );
  });

  it("filters by the language of the shop links", async () => {
    const alice = await signIn("alice@example.com");
    await addBook(alice, {
      title: "In Ukrainian",
      ownership: "wanted",
      links: [{ language: "uk", url: "https://shop.example/uk" }],
    });
    await addBook(alice, {
      title: "In Russian",
      ownership: "wanted",
      links: [{ language: "ru", url: "https://shop.example/ru" }],
    });

    const response = await api("/api/next-to-buy?language=uk", { cookie: alice });

    assert.deepEqual(
      response.body.items.map((item) => item.book.title),
      ["In Ukrainian"],
    );
  });

  it("does not offer another user's wanted books", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    await addBook(bob, { title: "Bob wants this", ownership: "wanted" });

    const response = await api("/api/next-to-buy", { cookie: alice });

    assert.deepEqual(response.body.items, []);
  });

  it("rejects an unknown filter value", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/next-to-buy?language=fr", { cookie: alice });

    assert.equal(response.status, 400);
  });
});
