# Design: test and verify scaffolding

## Problem

`CLAUDE.md` makes tests mandatory and requires `npm run verify`, but `server/package.json:8`
holds the placeholder `"test": "echo \"Error: no test specified\" && exit 1"` — there is no test
runner. `PATCH /api/books/:id` from the previous session was checked by hand with curl, and the
rules do not count that. The multi-tenancy section requires an integration test proving a
cross-user read fails; there is nowhere to run one.

Separately, `.gitattributes` is missing. That has already cost mixed line endings in
`server/controllers/bookController.js` when edited from a Windows machine.

## Out of scope

`DELETE /api/books/:id` and migrating the books module to three layers — separate PRs. A linter
and formatter for `server/`. CI. Frontend tests. DTOs and the `{ userId: 1, createdAt: -1 }`
index — those come with the books PR.

## Scale assumptions

One developer, one machine (Windows), Node 24. Tens of tests, not thousands. `verify` must
finish in under a minute: anything slower stops being run.

## Approach

The runner is the built-in `node:test` with `node:assert/strict`. Node 24 has `--test`,
`describe`/`it`, hooks and a global `fetch`. Zero new dependencies — a direct consequence of the
rule that a dependency must be justified by the standard library not being enough.

HTTP level: `server/index.js` splits into `app.js` (builds and exports the Express app) and
`index.js` (listens on a port, connects to Mongo). Without that split the app cannot be started
inside a test without taking a fixed port and opening a connection to the development database.
This is exactly the case the rules allow an abstraction for: "the code cannot be tested without
one". The test listens on port 0 and uses the global `fetch` — `supertest` is not needed.

Database: a separate `my-shelfie-test` database on the same Atlas cluster. The name is derived
from `MONGODB_URI` by replacing the path; `MONGODB_URI_TEST` overrides it explicitly. The helper
refuses to start when the resolved name equals the development one: "ran the tests, wiped my own
books" is a concrete and irreversible scenario, so the check is justified under principle 2.

`mongodb-memory-server` lost the comparison: it downloads a ~100 MB mongod binary, has a history
of being awkward on Windows (the project already records similar pain with the native `bcrypt`
build), and it is a new dependency where a working Atlas setup already exists.

## Trade-offs accepted

- **`verify` needs the network.** Tests do not run offline. Acceptable: development depends on
  Atlas anyway.
- **Tests are slower than an in-memory database** — a network round trip per request. Across
  tens of tests that is seconds, not minutes.
- **The test database shares a cluster with the development one.** Isolation is by database
  name, not by cluster.
- **`verify` has no linter yet.** `server/` has none, and adding one is its own task.
- **Tests do not run in parallel** — they share one database, hence `--test-concurrency=1`.
- **`verify` runs from `server/`, not from the root.** The rules ask for one command, but there
  is no root `package.json` and adding one is forbidden by the rule that packages are installed
  only inside `client/` and `server/`. For now there is one command per package.

## Cost

New files: `.gitattributes`, `server/app.js`, `server/test/helpers/db.js`,
`server/test/books.test.js`, `server/.env.example`, `docs/README.md`,
`docs/features/TEMPLATE.md`, this doc. Edits: `server/index.js`, `server/package.json`,
`docs/ROADMAP.md`. Zero new npm dependencies. Roughly 300 lines of diff.

## Open questions

- Keep the test database on Atlas, or run a local mongod? The latter removes the network
  requirement but adds an installation, and one more thing that breaks on Windows.
- Does `server/` need its own ESLint now, or is `node --check` still enough?

## What the first run showed (2026-09-14)

The very first `npm run verify` never reached a test: `MongooseServerSelectionError` /
`ReplicaSetNoPrimary`. Checked at the TCP level — the shard's DNS resolves, outbound 443 is
open, outbound 27017 times out. Three days earlier the same machine connected fine, so the
network changed, not the project.

This weakens the trade-off accepted above, that needing the network is fine. The assumption was
that nothing can be developed without Atlas anyway, so the tests lose nothing. In practice a
suite that passes or fails depending on which network you are on stops being run — which is
precisely what `npm run verify` exists to prevent. The first open question above is therefore no
longer theoretical.

**Decision (2026-09-14): keep Atlas.** The suite will be run from a network where 27017 is open,
rather than taking on `mongodb-memory-server` now.

## First real run (2026-09-14, home network)

Port 27017 open; `npm run verify` passed 9/9. Verified the suite can actually fail, not just
pass: temporarily dropped the `userId` filter in `getBook`'s ownership check, reran — exactly
"hides another user's book behind a 404 when reading it" went red, the other eight stayed
green, then reverted. Also removed a `findOneAndUpdate` deprecation warning (`{ new: true }` →
`{ returnDocument: "after" }`) that the run surfaced in code the PATCH work already owned.
