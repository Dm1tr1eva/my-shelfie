# Design: one central error handler

## Problem

`server/app.js` has no error-handling middleware. Every controller wraps its body in
`try/catch` and answers `500` itself (`bookController.js:33`, `seriesController.js:23`, …), and
`formatZodError` is copied into five controllers plus inline in `libraryController.js:7`.
Principle 7 says single-step failures propagate; the v3 design recorded this as an exception
to fix in its own PR. `express.json` errors bypass the controllers: a body over 512 KB answers
an HTML `413`, malformed JSON an HTML `400`, while the client reads `{ error }`.

## Out of scope

Moving `auth` off direct model imports (a follow-up). JSON for unknown routes. New endpoints.
Client changes beyond one translation.

## Scale assumptions

One Render instance, a handful of users, logs read only by the author.

## Approach

**Messages stay byte-identical.** The client translates fifteen per-endpoint `500` texts by
exact match (`client/lib/i18n/server-errors.ts`), so one generic text loses. Each route
declares its text: `failsWith("Failed to create book")` sets `res.locals.failureMessage`
before the controller. Without one, or before routing, the answer is `Request failed`, which
the client already translates.

**`server/errors/httpError.js`** (new): `HttpError(status, message)`, a message safe to send.
Its own file because services, validation and middleware all import it, and placing it in
`middleware/` would make services import transport code. The four existing domain errors
extend it with today's response: `SeriesNotFoundError` `400 seriesId: unknown series`,
`SeriesNumberWithoutSeriesError` `400 seriesNumber: needs a seriesId`, `ProgressPageError`
`400` with its message, `UpstreamError` `502 Book search is unavailable right now`.

**`server/validation/validate.js`** (new): `validate(schema, input, rootLabel = "body")`
returns the data or throws a `400` `HttpError`, replacing the six copies. `auth` passes `""`:
its copy printed `: Unrecognized key: "extra"` where the others print `body: …`.

**`server/middleware/errors.js`**: `failsWith` and `handleErrors`, registered last:

1. `HttpError` → its status and message.
2. `entity.too.large` → `413 Request body is too large`; `entity.parse.failed` →
   `400 Request body is not valid JSON`. Fixed texts: body-parser's parse message quotes the
   body.
3. Anything else → `500` with the route's text, logged once as `<METHOD> <path>` plus
   `err.stack`. No query string, and never the whole error object: a body-parser error carries
   the raw body in `err.body`.

Express 5 forwards rejected promises from async handlers, so controllers lose every
`try/catch`. `401`, `404` and `409` stay ordinary responses.

**Catches that stay** are translations, not propagation: `googleBooksService` turns a network
failure into `UpstreamError`; `readUserId` turns a bad token into "no user". No multi-step
operation recovers today: `deleteBook`, `deleteSeries` and `updateBook` write sequentially
without compensation, as their feature docs record.

**The 413 is reachable from a screen**: the book notes and series description textareas have
no `maxLength`. Today the client fails to parse the HTML and shows its generic error; JSON would
show untranslated English, so the message gets en/ru/uk translations. Malformed JSON cannot
come from the client, so it gets none.

## Trade-offs accepted

- **Services know HTTP statuses.** One class beats a handler that imports every feature's
  errors; no non-HTTP caller exists.
- **Other body-parser errors** (bad charset, aborted request) answer a logged `500 Request
  failed`. Our client never sends them.
- **No `res.headersSent` branch.** Every controller responds last; Express's final handler
  closes the socket if that changes.
- **A stack can carry data.** A duplicate-key error names the email; it needs two simultaneous
  registrations of one address, and only the author reads the logs.
- **The `auth` root label** keeps an inconsistency; unifying it is a visible message change.

## Cost

Three new files; six controllers, six routes and `app.js` edited; one test file; one client
translation key. No dependency.

## Open questions

- Unify the `auth` root label to `body:`?
- Should unknown `/api` routes answer JSON `404`?
