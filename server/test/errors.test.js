require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { format } = require("node:util");

const User = require("../models/user");
const bookService = require("../services/bookService");
const googleBooksService = require("../services/googleBooksService");
const libraryService = require("../services/libraryService");
const progressService = require("../services/progressService");
const seriesService = require("../services/seriesService");
const statsService = require("../services/statsService");
const yearGoalService = require("../services/yearGoalService");
const { useTestApp } = require("./helpers/app");

const { api, signIn, addBook } = useTestApp();

const SOME_ID = "000000000000000000000000";

const ROUTE_FAILURES = [
  {
    method: "POST",
    path: "/api/auth/register",
    body: { email: "new@example.com", password: "secret123", name: "New" },
    breaks: [User, "findOne"],
    error: "Registration failed",
  },
  {
    method: "POST",
    path: "/api/auth/login",
    body: { email: "failing@example.com", password: "secret123" },
    breaks: [User, "findOne"],
    error: "Login failed",
  },
  {
    method: "GET",
    path: "/api/auth/me",
    breaks: [User, "findById"],
    error: "Failed to fetch the current user",
  },
  {
    method: "POST",
    path: "/api/books",
    body: { title: "A book", author: "An author" },
    breaks: [bookService, "createBook"],
    error: "Failed to create book",
  },
  {
    method: "GET",
    path: "/api/books",
    breaks: [bookService, "listBooks"],
    error: "Failed to fetch books",
  },
  {
    method: "GET",
    path: "/api/books/search?q=dracula",
    breaks: [googleBooksService, "searchVolumes"],
    error: "Failed to search books",
  },
  {
    method: "GET",
    path: `/api/books/${SOME_ID}`,
    breaks: [bookService, "getBook"],
    error: "Failed to fetch book",
  },
  {
    method: "PATCH",
    path: `/api/books/${SOME_ID}`,
    body: { title: "Renamed" },
    breaks: [bookService, "updateBook"],
    error: "Failed to update book",
  },
  {
    method: "DELETE",
    path: `/api/books/${SOME_ID}`,
    breaks: [bookService, "deleteBook"],
    error: "Failed to delete book",
  },
  {
    method: "POST",
    path: "/api/series",
    body: { title: "A series" },
    breaks: [seriesService, "createSeries"],
    error: "Failed to create series",
  },
  {
    method: "GET",
    path: "/api/series",
    breaks: [seriesService, "listSeries"],
    error: "Failed to fetch series",
  },
  {
    method: "GET",
    path: `/api/series/${SOME_ID}`,
    breaks: [seriesService, "getSeries"],
    error: "Failed to fetch series",
  },
  {
    method: "PATCH",
    path: `/api/series/${SOME_ID}`,
    body: { title: "Renamed" },
    breaks: [seriesService, "updateSeries"],
    error: "Failed to update series",
  },
  {
    method: "DELETE",
    path: `/api/series/${SOME_ID}`,
    breaks: [seriesService, "deleteSeries"],
    error: "Failed to delete series",
  },
  {
    method: "GET",
    path: "/api/next-to-buy",
    breaks: [libraryService, "nextToBuy"],
    error: "Failed to build the list",
  },
  {
    method: "GET",
    path: "/api/wishlist",
    breaks: [libraryService, "wishlist"],
    error: "Failed to build the list",
  },
  {
    method: "GET",
    path: "/api/tropes",
    breaks: [libraryService, "listTropes"],
    error: "Failed to fetch tropes",
  },
  {
    method: "POST",
    path: "/api/progress",
    body: { bookId: SOME_ID, percent: 10 },
    breaks: [progressService, "recordProgress"],
    error: "Failed to save progress",
  },
  {
    method: "GET",
    path: "/api/progress",
    breaks: [progressService, "listLatest"],
    error: "Failed to fetch progress",
  },
  {
    method: "GET",
    path: "/api/year-goal",
    breaks: [yearGoalService, "getYearGoal"],
    error: "Failed to fetch the goal",
  },
  {
    method: "PUT",
    path: "/api/year-goal",
    body: { year: 2026, books: 12 },
    breaks: [yearGoalService, "setYearGoal"],
    error: "Failed to save the goal",
  },
  {
    method: "GET",
    path: "/api/stats",
    breaks: [statsService, "homeStats"],
    error: "Failed to fetch stats",
  },
];

function silenceErrors(t) {
  return t.mock.method(console, "error", () => {});
}

function loggedText(log) {
  return log.mock.calls.map((call) => format(...call.arguments)).join("\n");
}

describe("error responses", () => {
  for (const { method, path, body, breaks, error } of ROUTE_FAILURES) {
    it(`answers an unexpected failure of ${method} ${path} with "${error}", never the thrown message`, async (t) => {
      const cookie = await signIn(`failing-${method.toLowerCase()}@example.com`);
      silenceErrors(t);
      const [owner, name] = breaks;
      t.mock.method(owner, name, async () => {
        throw new Error("internal detail that must stay on the server");
      });

      const response = await api(path, { method, cookie, body });

      assert.equal(response.status, 500);
      assert.deepEqual(response.body, { error });
    });
  }

  it("logs an unexpected failure once with the method, path and stack, but no body, query or cookie", async (t) => {
    const cookie = await signIn("logged@example.com");
    const log = silenceErrors(t);
    t.mock.method(bookService, "createBook", async () => {
      throw Object.assign(new Error("thrown-marker"), { body: "body-marker" });
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
