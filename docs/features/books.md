# Feature: books

**Last verified against code:** 2026-10-11

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
| `GET /` | `200` with `{ books, total, page, limit }`, scoped to the caller. `?status=` filters; `?page=`/`?limit=` paginate (default `page=1`, `limit=20`). Also `?ownership=`, `?seriesId=`, `?genre=`, `?trope=`, `?q=` — see [series.md](series.md). |
| `GET /search?q=&startIndex=` | `200` with `{ results, nextStartIndex? }`, up to ten Google Books matches for the text, starting at `startIndex` (0 to 40, default 0); `nextStartIndex` is present only when another page may follow. `400` unless `q` is 3–200 characters and `startIndex` is the only other parameter. `502` when Google fails. See "Book search" below. Registered before `/:id`, or `search` would be read as an id. |
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
- **Paging, five pages at most.** `startIndex` goes to Google as given; the page size is fixed
  at ten. `nextStartIndex` is sent when Google returned a full page of ten volumes (counted
  before volumes without a title are dropped) and the next page would still start at 40 or
  below, so the most a search shows is fifty. Google's own `totalItems` is not used: it is an
  estimate that changes between pages. Past fifty, narrowing the text finds the book faster
  than scrolling.
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

`client/lib/books.ts`: `useBooks()` and `useBook(id)` (`swr` hooks) read; `useBookActions()`
creates, updates and deletes, then revalidates every library key (`/api/books`,
`/api/series`, `/api/next-to-buy`, `/api/tropes`) through the current `SWRConfig` cache. After a
delete the deleted book's own key is left alone — refetching it would answer `404` and put an
error in the browser console.

The screens, from the handoff in [../design/](../design/), are described in
[series.md](series.md) and [../designs/library-and-wishlist.md](../designs/library-and-wishlist.md).
The list is loaded once with `?limit=500` — no pagination UI, so a shelf past that size would be
silently truncated, and the counts and gaps with it — and everything else is derived on the
client in `lib/catalogue.ts`: the library and wishlist tabs, series groups, gaps, "own n of m"
and the stats. A number is a gap when it is wanted or missing and lower than the highest owned
number in the series, which is the rule `server/services/nextToBuy.js` applies; a novella such as
#2.5 counts. The shelf shows as a list or a cover grid, the choice kept in `localStorage`
(`lib/use-view-mode.ts`).

- `/library` and `/wishlist` — `components/library.tsx`
- `/books/[id]` — `components/book-page.tsx`: edits are a local draft, saved together from a
  "You have unsaved changes" bar that sends only the fields that changed; deleting asks
  `window.confirm`
- `/add` and `/add/[id]/details` — `components/add-book.tsx`, `components/add-details.tsx`:
  step 1 finds a book and adds it in one click and goes straight to step 2 (opened from a
  series, the book arrives with that series and number); step 2 adds series, genres, tropes and
  links and can be skipped. Genres and tropes default to those of the series' other books until
  you pick your own; shop links are asked for a wishlist book only, and a book that is on the
  shelf keeps whatever links it has. A book with
  no series starts the series field from its own title, with its author ready in the "new
  series" form, so a series named after its first book is one click (an existing series of
  that name is offered instead of a duplicate)
- Library and Wishlist show standalone books first, then series by the time their latest book
  was added, newest on top. A book of a series has "Add a book to this series" (search opened for
  the next number); "Where to buy" shows for a wishlist book only.
- `/next` — `components/next-to-buy.tsx`; `/series/[id]` — `components/series-page.tsx`
- Filters (`lib/filters.ts`, `components/filter-bar.tsx`): genre, trope, series status, author
  and shop language. Values within a group are OR, groups are AND, and each option's count is
  taken among the books that match the other groups. From 768 px each group is a button with a
  checkbox popover (Clear / Apply) and removable chips; below it a "Filters · n" button opens a
  bottom sheet of pills applied by "Show n books". Library and Wishlist filter the loaded list;
  Next to buy fetches the list once and filters in the browser. A filter on the Library hides
  gap tiles, like a search.
- Loading shows `components/skeleton.tsx` with a visible status line; a failed load shows
  `ErrorState` with "Try again" (the hooks expose `reload`); a missing book or series shows
  `NotFound` with a way back.
- `/dashboard` and `/dashboard/books/[id]` only redirect to `/library` and `/books/[id]`
- Tropes use `components/tag-input.tsx`: a field that grows and wraps with its text, 60
  characters a trope and 30 a book (the server's limits), a counter for the last ten characters,
  and "Already added" with the existing chip highlighted when the typed text is a trope the book
  has (case-insensitive); the text is kept.
- The series state is chosen with pills (`SeriesStatePills`): "Still coming out", "Finished",
  "Don't know". Chips and the Next to buy filter show Ongoing, Complete, Unknown.

**Search.** `/add` calls `GET /api/books/search` on submit (three characters at least) and
keeps nothing between searches — no SWR cache, because the results may not be stored. Below the
results, "Show more results" asks for the next page of the text that was searched, appends it, and skips volumes it
already listed; if that request fails the list stays and the button stays, with a message.
Changing the text hides the button at once, and an answer that arrives after that (or after a
newer search) is dropped, so a list never mixes two queries. The search starts by itself 400 ms after typing stops (three characters at least), aborting the
previous request; Enter and the button search at once. While a new search runs the old list
stays, dimmed, and is replaced when the answer arrives. A result
already on the shelf shows "Already in your library", or "Already on your wishlist" with a
"Move to library" action, instead of a second add. The "Powered by Google" mark
(`client/public/powered-by-google.png`, unaltered) shows beside any results, each result links
to Google, and a failed search says so and leaves adding by hand working. Covers are drawn
through a plain `<img>` (`components/book-cover.tsx`); `next/image` would copy them into
Vercel's optimizer. A book with no cover gets a generated one instead of an empty box: a
palette colour picked from a hash of its title, so it never changes between renders, with the
real title in Playfair italic, as in the handoff's stand-in covers. Choices from a short list
use `components/select.tsx`, a listbox styled with the tokens, never the browser's native
`<select>`. `/privacy` states what is stored and gives the takedown contact.

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
