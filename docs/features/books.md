# Feature: books

**Last verified against code:** 2026-10-08

## What it does

Lets a signed-in user keep a personal list of books: add one by hand, list and filter it,
read or edit a single entry, remove one. No sharing, no catalogue shared across users — one
list per user, matching the Stage 0 scope decision in [../ROADMAP.md](../ROADMAP.md).

## Invariants

- A book always belongs to exactly one user (`Book.userId`), set once at creation from the
  authenticated session and never from the request body.
- `status` is one of `want | reading | dropped | read`; `rating`, when present, is `1`–`5`.
- A caller can only see, change or delete their own books. A book that exists but belongs to
  someone else is indistinguishable, from the outside, from a book that does not exist.

## Shape

Three layers, per `CLAUDE.md`: `controllers/bookController.js` (parses and validates the
request with Zod, calls the service, maps the result through a DTO) →
`services/bookService.js` (a thin pass-through today — no cross-field invariant exists yet
that would live here) → `repositories/bookRepository.js` (every `Book` Mongoose call,
`userId` as the required first parameter of each method, folded into the query itself rather
than checked afterwards — so another user's book is indistinguishable from a missing one).
The repository also absorbs Mongoose's `CastError`: a malformed id returns `null`, the same
"not found" every caller already handles, instead of an exception only some callers would
know to catch. Validation schemas live in
`validation/bookSchemas.js`; the response shape in `dto/bookDto.js`.

## Endpoints

All routes are mounted at `/api/books` and require `requireAuth` (a valid `token` cookie).
Every request body is validated against a `zod` schema that mirrors `server/models/book.js`
exactly and rejects an unrecognized field — sending `userId` or `_id` in a body answers `400`,
it does not get silently dropped.

| Method and path | Answers |
|---|---|
| `POST /` | `201` with the created book. `400` on a schema violation (missing `title`/`author`, bad `status`/`rating`, an unrecognized field). |
| `GET /` | `200` with `{ books, total, page, limit }`, scoped to the caller. `?status=` filters; `?page=`/`?limit=` paginate (default `page=1`, `limit=20`). |
| `GET /search?q=` | `200` with `{ results }`, up to ten Google Books matches for the text. `400` unless `q` is 3–200 characters and the only parameter. `502` when Google fails. See "Book search" below. Registered before `/:id`, or `search` would be read as an id. |
| `GET /:id` | `200` with the book. `404` if it does not exist, belongs to another user, or `:id` is not a valid ObjectId. |
| `PATCH /:id` | `200` with the updated book. `400` if the body carries no recognized field, or a value fails schema validation. `404` under the same three conditions as `GET /:id`. |
| `DELETE /:id` | `204` with no body. `404` under the same three conditions as `GET /:id`. |

**What "field absent" means on `PATCH`:** a field missing from the body is left untouched. A
body with none of the schema's fields present answers `400` ("No updatable fields provided").

**What `null` means on `PATCH`:** clear the field. Allowed for the optional fields only —
`coverUrl`, `description`, `rating`, `review`, `startedAt`, `finishedAt`; `null` for
`title`, `author` or `status` answers `400`. Mongoose stores `null`, and the DTO omits it, so a
cleared field is absent from the response exactly like one that was never set. A cleared date
stays cleared — `null` is not coerced into 1970; a test pins that.

**Response shape:** `id` (string), `userId` (string — not secret; the caller already knows it
is their own book), `title`, `author`, `status`, `createdAt`, `updatedAt`, plus whichever of
`coverUrl`/`googleVolumeId`/`description`/`rating`/`review`/`startedAt`/`finishedAt` are set. An unset optional
field is omitted from the object, not sent as `null`. No `_id`, no `__v`.

## Book search

`services/googleBooksService.js` calls the Google Books `volumes` endpoint with `GOOGLE_BOOKS_API_KEY`
and maps each volume to `{ volumeId, title, authors, year?, coverUrl?, link? }`. Design and
the terms it honours: [google-books-search.md](../designs/google-books-search.md).

- **Free text only.** `q` goes to Google as typed: `inauthor:` and `intitle:` find nothing for
  Cyrillic, while plain text finds the book.
- **Covers are https.** Google returns `http://` thumbnails; the service rewrites them, or the
  deployed HTTPS site would log mixed-content warnings.
- **Optional means optional.** Only `volumeId` and `title` are guaranteed; a volume without a
  title is dropped. `link` is `canonicalVolumeLink`, falling back to `infoLink`, which for
  e-books is a Google Play Books page.
- **Failure is a `502`.** A non-2xx answer, a network error or the 8-second timeout throws
  `UpstreamError`, and the controller answers `502` with a generic message. Google's own text
  never reaches the client. A missing key is a plain `500`: a misconfiguration is not Google's
  fault. Google answered `503` twice in a row on 2026-10-08 and was fine a minute later.
- **The key stays on the server.** It is read from the environment, sent only to Google, and a
  test pins that it cannot appear in a response.
- **Nothing is copied.** The responses carry no `Cache-Control`, so no result is cached or
  stored. A book added from a result keeps `googleVolumeId` and a `coverUrl` pointing at
  Google; the description is not copied.

## Frontend consumer

`client/lib/books.ts`: `useBooks(status)` and `useBook(id)` (`swr` hooks) read;
`useBookActions()` creates, updates and deletes, then revalidates every list key through the
current `SWRConfig` cache. After a delete only list keys are revalidated — refetching the
deleted book's own key would answer `404` and put an error in the browser console.

The dashboard loads the whole list once (`?limit=100` explicitly — no pagination UI yet, so a
list past that size would be silently truncated, and the stats under-count with it) and
derives everything else on the client: stat cards from `lib/book-stats.ts`, a "Currently
reading" strip, and the status filter, which no longer asks the API again. The library shows as
a list or a cover grid, the choice kept in `localStorage` (`lib/use-view-mode.ts`).
`/dashboard/books/[id]` edits title, author, status, rating and review, and deletes after
`window.confirm`. Designs: [book-list.md](../designs/book-list.md),
[book-forms.md](../designs/book-forms.md), [visual-refresh.md](../designs/visual-refresh.md).

**Search in the add form.** `components/book-search.tsx` sits above the form's fields (outside
the `<form>`, so Enter in the search box cannot submit it) and `lib/book-search.ts`
(`useBookSearch`) drives it: it waits 400 ms after the last keystroke, needs three characters,
aborts a request that has been overtaken, and keeps nothing between searches — no SWR cache,
because the results may not be stored. A picked result fills title and author, which stay
editable, and the form then sends `googleVolumeId` and `coverUrl` with the book. The
"Powered by Google" mark (`client/public/powered-by-google.png`, unaltered) shows beside any
results, each result links to Google, and a failed search says so and leaves manual entry
working. The shelf rows (`components/book-row.tsx`) show the cover through a plain `<img>`;
`next/image` would copy it into Vercel's optimizer. `/privacy` states what is stored and gives
the takedown contact.

## Data

One collection, `Book` (`server/models/book.js`): `userId`, `title`, `author`, `coverUrl`,
`googleVolumeId`, `description`, `status`, `rating`, `review`, `startedAt`, `finishedAt`, plus `createdAt` /
`updatedAt` from `timestamps: true`. Compound index `{ userId: 1, createdAt: -1 }` — covers
both the filter every query uses and the sort `GET /` applies.

## Trade-offs accepted

- **Offset pagination, not cursor.** `CLAUDE.md` asks for cursor pagination on time-ordered
  lists; this project's own applicability note exempts it at this scale. Revisit if a list
  can exceed a few thousand rows or gains inserts while a page is being read.
- **The service layer has no logic of its own yet.** It exists because the three-layer shape
  is required outright, not because a use case needs it today. Revisit once a real invariant
  (e.g. `finishedAt >= startedAt`) shows up — it belongs here, not in the controller.
- **No rate limiting, no idempotency key on `POST /`.** A double-submit creates two books. No
  concrete user action produces this today (one browser tab, no retry logic on the frontend
  yet), so it is not built — see `CLAUDE.md` principle 2.

## Recovery

No known way, today, for a book to end up orphaned (`userId` pointing at a deleted user) or
stuck in an inconsistent state — there is no user-deletion endpoint yet and every write goes
through the ownership-scoped repository methods above. If that changes, the fix for an
orphaned book is a direct Mongo query:

```js
db.books.deleteMany({ userId: { $nin: db.users.distinct("_id") } })
```

## ADRs

None yet.
