const { before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../../app");
const { connectTestDb, clearTestDb, disconnectTestDb } = require("./db");

const PASSWORD = "secret123";

function useTestApp() {
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

  async function api(
    path,
    { method = "GET", body, rawBody, cookie, contentType = "application/json" } = {},
  ) {
    const headers = { "Content-Type": contentType };
    if (cookie) headers.Cookie = cookie;

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
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
    const cookie = login.setCookie.map((value) => value.split(";")[0]).join("; ");
    assert.ok(cookie.startsWith("token="), "login set no session cookie");
    return cookie;
  }

  async function userIdOf(cookie) {
    const me = await api("/api/auth/me", { cookie });
    assert.equal(typeof me.body?.id, "string");
    return me.body.id;
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

  async function addSeries(cookie, overrides = {}) {
    const created = await api("/api/series", {
      method: "POST",
      cookie,
      body: { title: "A series", author: "An author", ...overrides },
    });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    return created.body;
  }

  return { api, signIn, userIdOf, addBook, addSeries };
}

module.exports = { useTestApp };
