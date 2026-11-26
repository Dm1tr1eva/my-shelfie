# Feature: books

**Last verified against code:** 2026-11-26

## What it does

Lets a signed-in user keep a personal list of books: add one by hand, list and filter it,
read or edit a single entry, remove one. No sharing, no catalogue shared across users — one
list per user, matching the Stage 0 scope decision in [../ROADMAP.md](../ROADMAP.md).

## Invariants

- A book always belongs to exactly one user (`Book.userId`), set once at creation from the
  authenticated session and never from the request body.
- `status` is one of `want | reading | dropped | read`; `rating`, when present, is `1`–`5`.
- `format` is `paper`, `ebook` or `audio`, default `paper`, chosen per book and not shared with
  the series. A book saved before the field existed reads as `paper`: Mongoose applies the schema
  default when it loads the document, so there is no migration and the DTO adds no fallback.
- `desire` is `high | normal | someday`, default `normal`; `ageRating` is `none | 12 | 16 | 18`,
  default `none`. The default is the "not set" value, so neither can be cleared with `null`. Old
  books read with the defaults, the same way as `format`. A book in a series whose `ageRating` is
  set (not `none`) is returned with the series' value; otherwise with its own, which is kept
  either way and comes back if it leaves the series.
- `review` is no longer written. It meant the same as `notes` in the v3 design: the DTO
  returns an old `review` as `notes` when `notes` is empty and never returns `review`, and any
  `PATCH` of `notes` (`null` included) also clears the stored `review`, so clearing the note
  cannot bring the review back. Design: [../designs/v3-data-model.md](../designs/v3-data-model.md).
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

Errors are not caught in the controller. Validation goes through `validation/validate.js`,
which throws a `400` `HttpError` with each issue as `field: message` (`body: …` for the
whole body), joined by `; `; a service throws `HttpError` for a failure it knows (`400
seriesId: unknown series`, `400 seriesNumber: needs a seriesId`). Anything else reaches the
central handler (`middleware/errors.js`), which answers `500` with the text the route names
through `failsWith` (`Failed to create book`, …) and logs the method, path and stack. Design:
[../designs/central-error-handler.md](../designs/central-error-handler.md).

## Endpoints

All routes are mounted at `/api/books` and require `requireAuth` (a valid `token` cookie).
Every request body is validated against a `zod` schema that mirrors `server/models/book.js`
exactly and rejects an unrecognized field — sending `userId` or `_id` in a body answers `400`,
it does not get silently dropped.

| Method and path | Answers |
|---|---|
| `POST /` | `201` with the created book. `400` on a schema violation (missing `title`/`author`, bad `status`/`rating`, an unrecognized field — `review` included). |
| `GET /` | `200` with `{ books, total, page, limit }`, scoped to the caller. `?status=` filters; `?page=`/`?limit=` paginate (default `page=1`, `limit=20`). Also `?ownership=`, `?seriesId=`, `?genre=`, `?trope=`, `?q=` — see [series.md](series.md). |
| `GET /search?q=&startIndex=` | `200` with `{ results, nextStartIndex? }`, up to ten Google Books matches for the text, starting at `startIndex` (0 to 40, default 0); `nextStartIndex` is present only when another page may follow. `400` unless `q` is 3–200 characters and `startIndex` is the only other parameter. `502` when Google fails. See "Book search" below. Registered before `/:id`, or `search` would be read as an id. |
| `GET /:id` | `200` with the book. `404` if it does not exist, belongs to another user, or `:id` is not a valid ObjectId. |
| `PATCH /:id` | `200` with the updated book. `400` if the body carries no recognized field, or a value fails schema validation. `404` under the same three conditions as `GET /:id`. |
| `DELETE /:id` | `204` with no body; the book's progress entries go with it ([reading-progress.md](reading-progress.md)). `404` under the same three conditions as `GET /:id`. |

**What "field absent" means on `PATCH`:** a field missing from the body is left untouched. A
body with none of the schema's fields present answers `400` ("No updatable fields provided").

**What `null` means on `PATCH`:** clear the field. Allowed for the optional fields only —
`coverUrl`, `description`, `rating`, `pages`, `durationMinutes`, `recommend`, `startedAt`,
`finishedAt`; `null` for `title`, `author`, `status`, `desire`, `ageRating`, `moods` or `quotes`
answers `400`. Mongoose stores `null`, and the DTO omits it, so a
cleared field is absent from the response exactly like one that was never set. A cleared date
stays cleared — `null` is not coerced into 1970; a test pins that.

**Response shape:** `id` (string), `userId` (string — not secret; the caller already knows it
is their own book), `title`, `author`, `status`, `format`, `desire`, `ageRating`, `moods`,
`quotes`, `createdAt`, `updatedAt`, plus whichever of
`coverUrl`/`googleVolumeId`/`description`/`rating`/`pages`/`durationMinutes`/`recommend`/`startedAt`/`finishedAt`
are set. An unset optional field is omitted from the object, not sent as `null`. No `_id`, no
`__v`, no `review`.

**The v3 fields and their limits.** `pages` and `durationMinutes`: whole numbers from 1 to
10,000, allowed on any format (the client shows duration for an audiobook and pages otherwise).
`moods`: up to `MOODS_MAX` (12), each 1–`MOOD_NAME_MAX` (40) characters after trimming, unique
ignoring letter case, through `validation/textList.js` like genres. The mood constants are their
own, not the genre ones: today the numbers match, but moods are not genres and may change on
their own. Pages, duration and quote pages share `BOOK_LENGTH_MAX` (10,000). `recommend`: `yes | maybe | no`. `quotes`: up to 50
`{ text, page? }`, text 1–2,000 characters after trimming, page 1–10,000, no other field;
replaced as a whole, an empty array clears them.

**Body size.** `express.json` accepts up to 512 KB (`server/app.js`). The largest valid book —
50 quotes of 2,000 Cyrillic characters, plus the note, annotation, moods and tropes at their
limits — is about 230 KB, and a test sends it. A larger body is refused by Express with `413`
and an HTML page, not `{ error }`; only a body far past the documented limits can get there.

## Book search

`services/googleBooksService.js` calls the Google Books `volumes` endpoint with `GOOGLE_BOOKS_API_KEY`
and maps each volume to `{ volumeId, title, authors, year?, pageCount?, coverUrl?, link? }`
(`pageCount` only when Google has a positive whole number, so the add flow can prefill `pages`). Design and
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
  `UpstreamError`, an `HttpError` the central handler answers as `502` with a generic message.
  Google's own text never reaches the client. A missing key is a plain `500`: a misconfiguration is not Google's
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
client.

- `/library` — `components/library.tsx`, the v3 library
  ([../designs/v3-library.md](../designs/v3-library.md)), derived in `lib/shelves.ts`. Every
  book, owned and wanted, on one page: a shelf per series (newest first), then "Standalone
  books" by title. A series shelf holds its books by number (unnumbered last) and one dashed
  gap tile per run of missing whole numbers, counted up to the largest of `totalBooks`, the
  highest book number and the highest `expected` number; the gap opens
  `/add?series=…&number=<first>`. When `Series.expected` gives a year for any number of the
  run, the tile says "Not before <the earliest of them>" from 768 px (and in its accessible
  name at every width); the source is left to the series page. A half number (#2.5) is a book
  and never fills a gap. Seven slots a row from 64rem (1024 px at the default font size), four
  below — `matchMedia` asks the same query as Tailwind's `lg:`, so the count and the grid
  never disagree; a series of seven slots shows whole, a longer one shows one slot fewer and a
  "+N more" tile (N books and missing numbers) to `/series/[id]`; standalone books wrap onto
  as many shelves as they need. The series header (title, author, status, `SeriesSegments`) is
  one link to the series page. A tile is a cover, a two-line title and one meta line: status
  and rating for an owned book, "In wishlist" with a dimmed cover for a wanted one; below 768
  px the text is for screen readers only. Search matches title, author or series title. The
  filter button opens `FilterPanel` in a `Drawer` (side panel 420 px from 768 px, bottom sheet
  below; Esc, scrim and × close it, focus moves in and back; the portal is mounted only in the
  browser, so a server render draws nothing): I have, Status, Format, Genre, Age (only when
  some book has one), Tropes (with search), Author, Series status (with "Standalone books"),
  Link language, Link type, Rating (5, 4, 3 and lower, none). Status and Rating match books
  you have only: a wanted book shows neither, so it never matches one. Genre, Tropes and
  Author fold after four. The choices are a draft until "Show N books", whose count follows
  it; Reset empties the draft, closing drops it. Applied filters show as removable navy pills
  under the title and as a count on the button. Under a search or a filter a series shows only
  its matching books and disappears when none match; segments always describe the whole
  series. Gap tiles stay under a search and under the series-wide groups (genre, tropes, age,
  series status, author — a series book carries its series' genres, tropes and age) and hide
  as soon as a group about single books is on (I have, Status, Format, Rating, Link language,
  Link type, `BOOK_FILTER_KEYS` in `lib/filters.ts`): a missing book has none of those. The
  search and the applied filters are kept in the address (`lib/library-params.ts`): `q` and
  one parameter per group, repeated per value, in the panel's order
  (`/library?q=ash&have=wanted&genre=Fantasy`). The page reads them once with
  `useSearchParams` (inside a `Suspense` boundary in `app/library/page.tsx`, as the Next guide
  for `useSearchParams` advises and `/add` already does; the 16.3 build passes with or without
  it, checked 2026-11-26) and writes every change — typing, "Show N books", Reset, removing a
  pill — with `history.replaceState`, so a reload or a way back from a book or a series
  restores them and typing adds no history entries. Unknown parameters, values outside a fixed
  group's list (I have, Status, Format, Age, Series status, Rating, Link language and type),
  empty values, repeats and values over 200 characters are dropped without an error; free
  values (genre, trope, author) are kept as they are, and one the library no longer has shows
  as a pill that removes it. No tabs, stats line, view toggle or series notes, as in the v3
  handoff.
- `/wishlist` — `components/wishlist.tsx`, the v2 shelves until the Wishlist step: wanted
  books only, series groups from `lib/catalogue.ts` with "own n of m", a list or a cover grid
  (the choice kept in `localStorage`, `lib/use-view-mode.ts`), the v2 filter bar. Since
  2026-11-19 it has no My library / Wishlist tabs; its heading is "Wishlist". The `"library"`
  tab of `buildLibraryView` (and its gap slots) is no longer used by any screen, only by
  `lib/catalogue.test.ts`; the Wishlist step removes it with the v2 shelves.
- `/books/[id]` — `components/book-page.tsx`: edits are a local draft, saved together from a
  "You have unsaved changes" bar that sends only the fields that changed; deleting asks
  `window.confirm`
- `/add` and `/add/[id]/details` — `components/add-book.tsx`, `components/add-details.tsx`:
  step 1 finds a book and adds it in one click and goes straight to step 2 (opened from a
  series, the book arrives with that series and number); step 2 adds series, genres, tropes,
  links, reading status, rating and a note of your own, and can be skipped. Saving or skipping
  goes to the page of the book's series when it has one (the new book is there in its place,
  gaps included), otherwise to the Library or the Wishlist, whichever the book is in. Genres and tropes are those of the series when the book has one, and what you
  edit there is written to the series; shop links are asked for a wishlist book only, and a book that is on the
  shelf keeps whatever links it has. A book with
  no series starts the series field from its own title, with its author ready in the "new
  series" form, so a series named after its first book is one click (an existing series of
  that name is offered instead of a duplicate)
- Wishlist shows standalone books first, then series by the time their latest book
  was added, newest on top. A book of a series has "Add a book to this series" (search opened for
  the next number); "Where to get it" shows for a wishlist book only: its links grouped by what they lead to
  (Paper, E-book, Audio, Free e-book download, Read online — no "buy", as in the v3
  handoff), each with a badge per language of the link, and the same five kinds as a chip on every link in Next to buy and as a "Link type" filter —
  [../designs/link-kinds.md](../designs/link-kinds.md). A link carries `languages`, an array;
  the pickers on the book page and the details step still choose one language and write a
  one-element array, and changing the language of a link with several on the details step
  replaces them with the one chosen. Filters and badges read every language of a link.
- Every cover of a saved book carries a round mark in its top-right corner, an open book for
  paper, an e-reader for an e-book and headphones for an audiobook (the `format` prop of
  `BookCover`; the headphones are drawn in `book-cover.tsx` until the icon set is reworked). The
  mark is a `role="img"` labelled "Paper book", "E-book" or "Audiobook", so the format is also in
  words. A full-width cover narrower than 80 px (the phone library) leaves the mark out, as the
  v3 375 mockup does, so it cannot cover the `#N` pill. It shows in
  the library tiles and rows, the series page, Next to buy, the book page and the details step;
  not on search results. The format is a two-option radio group, paper or e-book, "Format", on the book page
  (saved through the unsaved-changes bar) and on the details step (sent only when changed) —
  [../designs/book-format.md](../designs/book-format.md). The details step also asks for the
  reading status and the rating of a book that is in the library (not of a wishlist book), and
  sends each only when it changed.
- On the series page "Add a note" and "Edit note" open the edit form, scroll it into view and put
  the cursor in the note; "Edit series" puts it in the title.
- On the series page the note is edited with a proper outline button ("Add a note" or "Edit
  note", with a pencil icon).
- `/next` — `components/next-to-buy.tsx`; `/series/[id]` — `components/series-page.tsx`.
  Since the v3 shell (2026-11-19) `/next` has no nav item; it works by URL until the Wishlist
  step replaces it — [../designs/v3-tokens-shell.md](../designs/v3-tokens-shell.md)
- Labels (`components/chips.tsx`, the v3 rules of one form per meaning): an owned book shows its
  reading status as a dot and a word (`StatusDot`: To read, Reading, Read, Dropped; «В планах» /
  «У планах» in Russian and Ukrainian); a wanted book on the series page and in list rows shows
  the bookmark pill "In wishlist" (`WishlistLabel`); series status is an outline pill, a link
  language a one-colour outline code, a number `#N` in Inter tabular figures, on covers a white
  pill top-left
- Filters on Wishlist and Next to buy (`lib/filters.ts`, `components/filter-bar.tsx`): genre,
  trope, series status, author and shop language. Values within a group are OR, groups are AND, and each option's count is
  taken among the books that match the other groups. From 768 px each group is a button with a
  checkbox popover (Clear / Apply) and removable chips; below it a "Filters · n" button opens a
  bottom sheet of pills applied by "Show n books". Wishlist filters the loaded list;
  Next to buy fetches the list once and filters in the browser.
- Loading shows `components/skeleton.tsx` with a visible status line; a failed load shows
  `ErrorState` with "Try again" (the hooks expose `reload`); a missing book or series shows
  `NotFound` with a way back.
- `/dashboard` and `/dashboard/books/[id]` only redirect to `/library` and `/books/[id]`
- Tropes use `components/tag-input.tsx`: a field that grows and wraps with its text, 60
  characters a trope and 30 a book (the server's limits), a counter for the last ten characters,
  and "Already added" with the existing chip highlighted when the typed text is a trope the book
  has (case-insensitive); the text is kept. Each tag is one frame holding its text and a round
  remove button, so the button plainly belongs to that tag.
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
`googleVolumeId`, `description`, `format`, `pages`, `durationMinutes`, `status`, `rating`, `review`
(legacy, read only), `moods`, `recommend`, `quotes`, `desire`, `ageRating`, `startedAt`,
`finishedAt`, plus `createdAt` / `updatedAt` from `timestamps: true`. Compound index `{ userId: 1, createdAt: -1 }` — covers
both the filter every query uses and the sort `GET /` applies.

## Trade-offs accepted

- **Offset pagination, not cursor.** `CLAUDE.md` asks for cursor pagination on time-ordered
  lists; this project's own applicability note exempts it at this scale. Revisit if a list
  can exceed a few thousand rows or gains inserts while a page is being read.
- **The service layer has no logic of its own yet.** It exists because the three-layer shape
  is required outright, not because a use case needs it today. Revisit once a real invariant
  (e.g. `finishedAt >= startedAt`) shows up — it belongs here, not in the controller.
- **`review` stays in the database.** The DTO hides it behind `notes`; moving the text is a
  one-off query under Recovery, not code.
- **Nothing ties `durationMinutes` to an audiobook or `pages` to print.** A book switched to
  audio keeps its pages; the client decides which to show.
- **The current client cannot make a book an audiobook.** The format toggle keeps two options
  (three overflow at 320 px) until the v3 book panel replaces it; an audiobook made through the
  API shows the toggle with nothing selected and a headphones mark on its cover.
- **A deploy briefly mixes link shapes.** The API now sends `links[].languages` and no longer
  `links[].language`. Vercel and Render finish deploying at different times, so for a few
  minutes an open tab running the old client can meet the new server (or the new client the old
  server) and fail to draw link badges. No compatibility code is kept for that window: reload
  open tabs after a deploy.
- **A body over 512 KB answers `413 { error: "Request body is too large" }`**, and malformed
  JSON `400 { error: "Request body is not valid JSON" }`. Nothing within the documented limits
  gets near 512 KB, but the notes textarea has no `maxLength`, so the client translates the
  first; it never sends the second.
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

To move old reviews into empty notes for good (the DTO already shows them there), once. A
book that has both keeps its `review` hidden; merge those by hand if the text matters:

```js
db.books.updateMany(
  { review: { $nin: [null, ""] }, notes: { $in: [null, ""] } },
  [{ $set: { notes: "$review" } }, { $unset: "review" }],
)
```

## ADRs

None yet.
