require("dotenv").config({ quiet: true });

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../app");
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
  // before() can fail while connecting to the database, leaving no server here.
  // Without this guard the real error drowns in a second, meaningless one.
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

async function addBook(cookie, overrides = {}) {
  const created = await api("/api/books", {
    method: "POST",
    cookie,
    body: { title: "Дюна", author: "Фрэнк Герберт", ...overrides },
  });

  assert.equal(created.status, 201);
  return created.body;
}

describe("books API", () => {
  it("refuses a request with no session cookie", async () => {
    const response = await api("/api/books");

    assert.equal(response.status, 401);
  });

  it("lists only the books belonging to the caller", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    await addBook(alice, { title: "Книга Алисы" });
    await addBook(bob, { title: "Книга Боба" });

    const response = await api("/api/books", { cookie: alice });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.books.map((book) => book.title),
      ["Книга Алисы"],
    );
    assert.equal(response.body.total, 1);
  });

  it("hides another user's book behind a 404 when reading it", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book._id}`, { cookie: bob });

    assert.equal(response.status, 404);
  });

  it("hides another user's book behind a 404 when updating it", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book._id}`, {
      method: "PATCH",
      cookie: bob,
      body: { title: "Присвоено" },
    });

    assert.equal(response.status, 404);

    const stillAlices = await api(`/api/books/${book._id}`, { cookie: alice });
    assert.equal(stillAlices.body.title, "Дюна");
  });

  it("ignores userId in the body so a book cannot change owner", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);
    const strangerId = "000000000000000000000000";

    const response = await api(`/api/books/${book._id}`, {
      method: "PATCH",
      cookie: alice,
      body: { userId: strangerId, title: "Дюна (ред.)" },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.userId, book.userId);
    assert.equal(response.body.title, "Дюна (ред.)");
  });

  it("rejects a rating outside the 1-5 range", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book._id}`, {
      method: "PATCH",
      cookie: alice,
      body: { rating: 9 },
    });

    assert.equal(response.status, 400);
  });

  it("rejects a status outside the allowed set", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book._id}`, {
      method: "PATCH",
      cookie: alice,
      body: { status: "finished" },
    });

    assert.equal(response.status, 400);
  });

  it("rejects an update that carries no updatable field", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book._id}`, {
      method: "PATCH",
      cookie: alice,
      body: {},
    });

    assert.equal(response.status, 400);
  });

  it("answers 404 rather than 500 for a malformed book id", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/books/not-an-object-id", {
      method: "PATCH",
      cookie: alice,
      body: { status: "read" },
    });

    assert.equal(response.status, 404);
  });

  it("deletes a book the caller owns", async () => {
    const alice = await signIn("alice@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book._id}`, {
      method: "DELETE",
      cookie: alice,
    });

    assert.equal(response.status, 204);

    const afterDelete = await api(`/api/books/${book._id}`, { cookie: alice });
    assert.equal(afterDelete.status, 404);
  });

  it("hides another user's book behind a 404 when deleting it, and does not delete it", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");
    const book = await addBook(alice);

    const response = await api(`/api/books/${book._id}`, {
      method: "DELETE",
      cookie: bob,
    });

    assert.equal(response.status, 404);

    const stillThere = await api(`/api/books/${book._id}`, { cookie: alice });
    assert.equal(stillThere.status, 200);
  });

  it("answers 404 rather than 500 when deleting a malformed book id", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/books/not-an-object-id", {
      method: "DELETE",
      cookie: alice,
    });

    assert.equal(response.status, 404);
  });

  it("answers 404 when deleting a book that is already gone", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/books/000000000000000000000000", {
      method: "DELETE",
      cookie: alice,
    });

    assert.equal(response.status, 404);
  });
});
