require("dotenv").config({ quiet: true });

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const User = require("../models/user");
const { useTestApp } = require("./helpers/app");

const { api, signIn, userIdOf } = useTestApp();

function putGoal(cookie, body) {
  return api("/api/year-goal", { method: "PUT", cookie, body });
}

describe("year goal API", () => {
  it("refuses a request with no session cookie", async () => {
    const read = await api("/api/year-goal");
    const write = await putGoal(undefined, { year: 2026, books: 24 });

    assert.equal(read.status, 401);
    assert.equal(write.status, 401);
  });

  it("answers null before a goal is set", async () => {
    const alice = await signIn("alice@example.com");

    const response = await api("/api/year-goal", { cookie: alice });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { yearGoal: null });
  });

  it("stores a goal, reads it back and replaces it with the next one", async () => {
    const alice = await signIn("alice@example.com");

    const first = await putGoal(alice, { year: 2026, books: 24 });
    const second = await putGoal(alice, { year: 2026, books: 36 });
    const read = await api("/api/year-goal", { cookie: alice });

    assert.equal(first.status, 200);
    assert.deepEqual(first.body, { yearGoal: { year: 2026, books: 24 } });
    assert.deepEqual(second.body, { yearGoal: { year: 2026, books: 36 } });
    assert.deepEqual(read.body, { yearGoal: { year: 2026, books: 36 } });
  });

  it("keeps each user's goal to that user", async () => {
    const alice = await signIn("alice@example.com");
    const bob = await signIn("bob@example.com");

    await putGoal(alice, { year: 2026, books: 24 });
    const bobs = await api("/api/year-goal", { cookie: bob });

    assert.deepEqual(bobs.body, { yearGoal: null });
  });

  it("rejects a year outside 2000 to 2100, a count outside 1 to 1,000, fractions, a missing value and an unknown field", async () => {
    const alice = await signIn("alice@example.com");

    for (const body of [
      { year: 1999, books: 24 },
      { year: 2101, books: 24 },
      { year: 2026, books: 0 },
      { year: 2026, books: 1001 },
      { year: 2026, books: 2.5 },
      { year: 2026 },
      { books: 24 },
      { year: 2026, books: 24, userId: "000000000000000000000000" },
    ]) {
      const response = await putGoal(alice, body);
      assert.equal(response.status, 400, JSON.stringify(body));
    }
    const read = await api("/api/year-goal", { cookie: alice });
    assert.deepEqual(read.body, { yearGoal: null });
  });

  it("answers 404 when the account behind the session no longer exists", async () => {
    const alice = await signIn("alice@example.com");
    await User.deleteOne({ _id: await userIdOf(alice) });

    const response = await putGoal(alice, { year: 2026, books: 24 });

    assert.equal(response.status, 404);
  });
});
