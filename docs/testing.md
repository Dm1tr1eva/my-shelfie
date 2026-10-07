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
