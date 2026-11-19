require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const bookService = require("../services/bookService");
const { useTestApp } = require("./helpers/app");

const { api, signIn, addBook } = useTestApp();

function silenceErrors(t) {
  return t.mock.method(console, "error", () => {});
}

function loggedText(log) {
  return log.mock.calls.map((call) => call.arguments.join(" ")).join("\n");
}

describe("error responses", () => {
  it("answers an unexpected failure with the route's message, never the thrown one", async (t) => {
    const cookie = await signIn("unexpected@example.com");
    silenceErrors(t);
    t.mock.method(bookService, "listBooks", async () => {
      throw new Error("internal detail that must stay on the server");
    });

    const response = await api("/api/books", { cookie });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Failed to fetch books" });
  });

  it("logs an unexpected failure once with the method, path and stack, but no body, query or cookie", async (t) => {
    const cookie = await signIn("logged@example.com");
    const log = silenceErrors(t);
    t.mock.method(bookService, "createBook", async () => {
      throw new Error("thrown-marker");
    });

    const response = await api("/api/books?q=query-marker", {
      method: "POST",
      cookie,
      body: { title: "body-marker", author: "An author" },
    });

    assert.equal(response.status, 500);
    assert.equal(log.mock.callCount(), 1);
    assert.equal(log.mock.calls[0].arguments[0], "POST /api/books");

    const logged = loggedText(log);
    assert.match(logged, /thrown-marker/);
    assert.doesNotMatch(logged, /body-marker/);
    assert.doesNotMatch(logged, /query-marker/);
    assert.ok(!logged.includes(cookie.split("=")[1]), "the session token was logged");
  });

  it("answers a failure before any route with the generic message", async (t) => {
    silenceErrors(t);

    const response = await api("/api/books", {
      method: "POST",
      contentType: "application/json; charset=latin1",
      rawBody: "{}",
    });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Request failed" });
  });

  it("answers 413 as JSON for a body over the limit, without logging it", async (t) => {
    const log = silenceErrors(t);

    const response = await api("/api/books", {
      method: "POST",
      body: { title: "x".repeat(600 * 1024), author: "An author" },
    });

    assert.equal(response.status, 413);
    assert.deepEqual(response.body, { error: "Request body is too large" });
    assert.equal(log.mock.callCount(), 0);
  });

  it("answers 400 as JSON for malformed JSON, without echoing the body or logging it", async (t) => {
    const log = silenceErrors(t);

    const response = await api("/api/auth/login", {
      method: "POST",
      rawBody: '{"email": "body-marker',
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "Request body is not valid JSON" });
    assert.equal(log.mock.callCount(), 0);
  });

  it("answers a known failure from a service with its own status and message, without logging it", async (t) => {
    const cookie = await signIn("known@example.com");
    const book = await addBook(cookie);
    const log = silenceErrors(t);

    const response = await api(`/api/books/${book.id}`, {
      method: "PATCH",
      cookie,
      body: { seriesNumber: 2 },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "seriesNumber: needs a seriesId" });
    assert.equal(log.mock.callCount(), 0);
  });

  it("answers a validation failure with each issue as field and message, joined by semicolons", async () => {
    const cookie = await signIn("fields@example.com");

    const response = await api("/api/series", {
      method: "POST",
      cookie,
      body: { title: "", totalBooks: 0 },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      error:
        "title: Too small: expected string to have >=1 characters; " +
        "totalBooks: Too small: expected number to be >=1",
    });
  });

  it("names an issue about the whole body 'body'", async () => {
    const cookie = await signIn("root@example.com");
    const book = await addBook(cookie);

    const response = await api(`/api/books/${book.id}`, { method: "PATCH", cookie, body: {} });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "body: No updatable fields provided" });
  });

  it("leaves an issue about the whole body unnamed on the auth endpoints, as before", async () => {
    const response = await api("/api/auth/register", {
      method: "POST",
      body: { email: "extra@example.com", password: "secret123", name: "Extra", extra: 1 },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: ': Unrecognized key: "extra"' });
  });
});
