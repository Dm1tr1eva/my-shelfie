# Testing notes

Pitfalls that cost real debugging time here. The code carries no comments, so each one is
recorded here instead. How to run the suites is in [README.md](README.md).

## Server (`server/test/`, `node:test` against a real MongoDB)

- **Never run against the development database.** The helper
  (`test/helpers/db.js`) derives `<name>-test` from `MONGODB_URI` and refuses to start if
  `MONGODB_URI_TEST` resolves to the same database name — every collection is wiped between
  tests, and there is nothing to restore a wiped shelf from.
- **A passing test can be satisfied by the wrong output.** The logout test first looked
  green with `clearCookie()` disabled: no `Set-Cookie` meant an empty array, which became an
  empty `Cookie` header, which the `api()` helper treats as "no cookie" — and a request with
  no cookie also answers `/me` with `null`. The test now asserts `logout.setCookie.length > 0`
  before using it. Whenever a test builds its next request from a previous response, assert
  that the response actually contained what the next request needs.
- **Guard `after()` when `before()` can fail.** If the database connection fails in
  `before()`, no HTTP server exists yet; closing `undefined` throws a second, meaningless
  error that buries the real one.
- **Run several server test files with `--test-concurrency=1`.** `node --test a.test.js
  b.test.js` runs the files in parallel, and they wipe the same database under each other: a
  test fails for no reason in its own file. `npm test` already passes the flag. The files added
  for v3 (`bookDetails`, `seriesDetails`, `progress`, `yearGoal`) share their server, session
  and fixture setup through `test/helpers/app.js`; the older files keep their own copies.
- **Force a `500` by mocking a service, not the database.** `errors.test.js` replaces
  `bookService.listBooks` with `t.mock.method`, which works because controllers call
  `bookService.listBooks(...)` through the module object; a destructured import would keep the
  real function. Silence `console.error` the same way, and assert on its calls: the log line is
  the contract there.
- **A cross-user test can pass with the user filter gone.** In `stats.test.js`, Bob's progress
  entries point at Bob's books, which Alice's stats drop as orphans, so removing `userId` from
  `progressRepository.findAllForUser` changed nothing. The test now also inserts an entry of
  Bob's that points at Alice's book. When the code joins one user's data to another collection,
  make the foreign record point at the caller's data, or the join hides the leak.
- **A sum can hide a wrong term.** The first percent-only-entry test summed to the same total
  with the fallback replaced by 0 (30 + 120 and 0 + 150). Put the case under test where a wrong
  value changes the result, and break it to check.
- **A tie-break needs input in the opposite order.** A sort's second key (genres by name,
  books without progress by age, the series cover by number) passed with the key removed while
  the fixtures were already in the expected order: `Array.prototype.sort` is stable. Feed the
  tied items in reverse; the same goes for a date rule checked only on days where the wrong
  rule agrees (the quote by day of month matched the day number from 26 to 29 November, and
  differs across 31 January → 1 February).
- **Home stats are tested at two levels.** `homeStats.test.js` drives the pure builder with a
  fixed `now` (year edges, weeks left, the quote's day); `stats.test.js` goes through HTTP and
  the database (isolation, query validation, documents saved before v3). The HTTP tests cannot
  fix the clock, so they use the current year and ranges rather than exact `weeksLeft`.
- **A test nobody has seen fail is a guess.** Break the behaviour it covers (remove the
  ownership filter, drop `.strict()`, restore the old `401`) and confirm exactly that test
  goes red.

## Client (`client/**/*.test.tsx`, Vitest + Testing Library, `fetch` mocked)

- **`swr`'s `isLoading` is ambiguous.** It is `false` both while the key is still `null`
  (session not checked yet, nothing fetched) and after real data has arrived, so
  `waitFor(() => isLoading === false)` can pass before anything loaded. Render `useAuth()`
  and `useBooks()` together and wait on `auth.status` first.
- **`swr` keeps its cache at module level**, shared by every `useSWR` call in the process.
  Two tests using the same key (`/api/books?limit=100`) otherwise see each other's cached
  response. Wrap every render in `<SWRConfig value={{ provider: () => new Map() }}>`. The
  hooks that mutate through `useSWRConfig().mutate` then act on that same isolated cache.
- **Expected errors are noisy.** The test that renders `useAuth()` outside its provider
  silences `console.error` for that one render, because React logs the thrown error.
- **Mocked `fetch` cannot prove a real cross-origin cookie round trip.** After touching auth
  or CORS, check once by hand in a browser: register, reload the page and stay signed in,
  log out, visit `/dashboard` signed out and get redirected.

- **The server/client module boundary is checked by a test, not by jsdom.** Testing Library
  renders everything in one environment, so a server component that reads a constant from a
  `"use client"` module passes there and fails in Next (`LINK_LANGUAGES.find is not a
  function` on the home page, 2026-10-13). `client/app/server-boundary.test.ts` walks the
  imports of every `page.tsx` and `layout.tsx` and fails when code a server component runs
  reads a value from a client module in `lib/`; such shared constants live in
  `lib/catalogue-constants.ts`, which has no directive.

- **`findByRole` can match the wrong state.** While the session check runs, `AppFrame` shows
  the public header, and its logo already links to `/`. A test for the signed-in logo that
  only awaited `findByRole("link", { name: "my-shelfie" })` passed on the old code (2026-10-15).
  Before asserting on an element both shells share, wait for something only the state under
  test has — here the Wishlist link of the signed-in nav — and only then look at the shared one.
