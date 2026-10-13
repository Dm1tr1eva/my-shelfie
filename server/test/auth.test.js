require("dotenv").config({ quiet: true });

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../app");
const User = require("../models/user");
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

async function loginCookies(email) {
  await api("/api/auth/register", {
    method: "POST",
    body: { email, password: PASSWORD, name: "Alice" },
  });

  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD },
  });

  assert.equal(login.status, 200, `login failed for ${email}`);
  return login.setCookie;
}

async function signIn(email) {
  const setCookie = await loginCookies(email);
  return setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
}

describe("auth API", () => {
  it("rejects a registration with a password shorter than eight characters, without creating the user", async () => {
    const response = await api("/api/auth/register", {
      method: "POST",
      body: { email: "short@example.com", password: "1234567", name: "Short" },
    });

    assert.equal(response.status, 400);
    assert.match(response.body.error, /password: must be at least 8 characters/);
    assert.equal(await User.countDocuments({ email: "short@example.com" }), 0);
  });

  it("rejects a malformed email, an empty name, an unknown field and a password that is too long", async () => {
    const valid = { email: "ok@example.com", password: PASSWORD, name: "Ok" };
    const cases = [
      { ...valid, email: "not-an-email" },
      { ...valid, name: "   " },
      { ...valid, role: "admin" },
      { ...valid, password: "x".repeat(73) },
      { ...valid, password: undefined },
    ];

    for (const body of cases) {
      const response = await api("/api/auth/register", { method: "POST", body });
      assert.equal(response.status, 400, JSON.stringify(Object.keys(body)));
    }
    assert.equal(await User.countDocuments({}), 0);
  });

  it("accepts a password of exactly eight characters and still answers 409 for a taken email", async () => {
    const body = { email: "eight@example.com", password: "12345678", name: "Eight" };

    const first = await api("/api/auth/register", { method: "POST", body });
    const second = await api("/api/auth/register", { method: "POST", body });

    assert.equal(first.status, 201);
    assert.equal(second.status, 409);
  });

  it("answers 400, not a session or a 500, to a sign-in that sends an object as the email", async () => {
    await api("/api/auth/register", {
      method: "POST",
      body: { email: "victim@example.com", password: PASSWORD, name: "Victim" },
    });

    const response = await api("/api/auth/login", {
      method: "POST",
      body: { email: { $ne: null }, password: PASSWORD },
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.setCookie, []);
  });

  it("answers 400 to a sign-in with no password", async () => {
    const response = await api("/api/auth/login", {
      method: "POST",
      body: { email: "someone@example.com" },
    });

    assert.equal(response.status, 400);
  });

  it("lets an account saved with a short password keep signing in", async () => {
    const bcrypt = require("bcrypt");
    await User.create({
      email: "old@example.com",
      passwordHash: await bcrypt.hash("short", 10),
      name: "Old",
    });

    const response = await api("/api/auth/login", {
      method: "POST",
      body: { email: "old@example.com", password: "short" },
    });

    assert.equal(response.status, 200);
  });

  it("answers null on /me with no session cookie, without an error status", async () => {
    const response = await api("/api/auth/me");

    assert.equal(response.status, 200);
    assert.equal(response.body, null);
  });

  it("answers null on /me for a tampered session cookie", async () => {
    const response = await api("/api/auth/me", { cookie: "token=not-a-real-jwt" });

    assert.equal(response.status, 200);
    assert.equal(response.body, null);
  });

  it("returns the signed-in user's id, email and name on /me", async () => {
    const cookie = await signIn("alice@example.com");

    const response = await api("/api/auth/me", { cookie });

    assert.equal(response.status, 200);
    assert.equal(response.body.email, "alice@example.com");
    assert.equal(response.body.name, "Alice");
    assert.equal(typeof response.body.id, "string");
  });

  it("answers null on /me when the token names a user that no longer exists", async () => {
    const cookie = await signIn("alice@example.com");
    await User.deleteOne({ email: "alice@example.com" });

    const response = await api("/api/auth/me", { cookie });

    assert.equal(response.status, 200);
    assert.equal(response.body, null);
  });

  it("sets the session cookie HttpOnly and SameSite=Lax, without Secure outside production", async () => {
    const cookie = (await loginCookies("alice@example.com"))[0];

    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.doesNotMatch(cookie, /Secure/i);
  });

  it("marks the session cookie and its removal Secure in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const loginSetCookie = (await loginCookies("alice@example.com"))[0];
      const logout = await api("/api/auth/logout", { method: "POST" });

      assert.match(loginSetCookie, /Secure/i);
      assert.match(logout.setCookie[0], /Secure/i);
      assert.match(logout.setCookie[0], /SameSite=Lax/i);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it("clears the session on logout, so /me answers null afterward", async () => {
    const cookie = await signIn("alice@example.com");

    const logout = await api("/api/auth/logout", { method: "POST", cookie });
    assert.equal(logout.status, 204);

    assert.ok(logout.setCookie.length > 0, "logout did not clear the cookie");
    const clearedCookie = logout.setCookie.map((c) => c.split(";")[0]).join("; ");
    const afterLogout = await api("/api/auth/me", { cookie: clearedCookie });

    assert.equal(afterLogout.status, 200);
    assert.equal(afterLogout.body, null);
  });
});
