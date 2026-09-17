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
    body: { email, password: PASSWORD, name: "Alice" },
  });

  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD },
  });

  assert.equal(login.status, 200, `login failed for ${email}`);
  return login.setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
}

describe("auth API", () => {
  it("refuses /me with no session cookie", async () => {
    const response = await api("/api/auth/me");

    assert.equal(response.status, 401);
  });

  it("returns the signed-in user's id, email and name on /me", async () => {
    const cookie = await signIn("alice@example.com");

    const response = await api("/api/auth/me", { cookie });

    assert.equal(response.status, 200);
    assert.equal(response.body.email, "alice@example.com");
    assert.equal(response.body.name, "Alice");
    assert.equal(typeof response.body.id, "string");
  });

  it("clears the session on logout, so /me answers 401 afterward", async () => {
    const cookie = await signIn("alice@example.com");

    const logout = await api("/api/auth/logout", { method: "POST", cookie });
    assert.equal(logout.status, 204);

    // Assert the server actually sent a Set-Cookie before trusting it: an
    // empty logout.setCookie would silently turn into an empty Cookie header
    // below, and a request with no cookie at all also answers 401 — that
    // would make this test pass even if logout stopped clearing anything.
    assert.ok(logout.setCookie.length > 0, "logout did not clear the cookie");
    const clearedCookie = logout.setCookie
      .map((c) => c.split(";")[0])
      .join("; ");
    const afterLogout = await api("/api/auth/me", { cookie: clearedCookie });

    assert.equal(afterLogout.status, 401);
  });
});
