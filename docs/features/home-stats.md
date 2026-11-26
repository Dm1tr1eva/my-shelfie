# Feature: Home stats

**Last verified against code:** 2026-11-26

## What it does

Answers everything the v3 Home page shows after sign-in in one request: the four stat tiles,
the year goal ring, books read per month, what is being read now, genres on the shelf, series
waiting for their next book, the "Very much" part of the wishlist, a quote of the day and the
newest books on the shelf. Read only: progress is written through `/api/progress`
([reading-progress.md](reading-progress.md)), the goal through `/api/year-goal`. Design and the
reasons behind each rule: [../designs/v3-home-stats-api.md](../designs/v3-home-stats-api.md).

## Invariants

- Every number comes from the caller's own books, series, progress entries and goal. Nothing of
  another user is read: each query filters by the session's `userId`, progress entries included,
  so a stray entry of another user pointing at your book is not counted.
- Nothing is stored: every value is derived on each request, so it cannot drift from the books.
- Calendar arithmetic is UTC: a year runs from 1 January 00:00 UTC to the next, a month by
  `getUTCMonth`, "today" is the UTC date.
- `year` changes the read count, pages, months and goal only. The other blocks describe the
  shelf as it is now.

## Endpoints

| Method and path | Answers |
|---|---|
| `GET /api/stats?year=YYYY` | `200` with the object below. `year` is optional, four digits, 2000–2100; without it, the current UTC year. Any other parameter, a repeated `year`, or a year that is not four plain digits answers `400` (`year: Expected a four-digit year`, `query: Unrecognized key: "month"`). `401` without a session. An unexpected failure is `500 Failed to fetch stats` — a new text the client has to translate. |

## Response

```json
{
  "year": 2026,
  "readCount": 9,
  "pagesRead": 3420,
  "waitingOnShelf": 4,
  "seriesComplete": { "complete": 1, "of": 4 },
  "yearGoal": { "year": 2026, "target": 24, "done": 9, "percent": 38, "weeksLeft": 6 },
  "readPerMonth": [{ "month": 9, "books": [{ "...book": "", "rating": 5, "finishedAt": "2026-09-14T00:00:00.000Z" }] }],
  "currentlyReading": [{ "...book": "", "pages": 512, "startedAt": "…", "progress": { "percent": 50, "page": 256, "date": "…" } }],
  "genres": [{ "name": "Fantasy", "count": 6 }],
  "waitingForContinuation": [{ "series": { "id": "…", "title": "Roots of Chaos" }, "number": 4, "expectedYear": 2027, "source": "fantlab" }],
  "veryMuch": [
    { "type": "series", "group": "continue", "id": "…", "title": "…", "coverUrl": "…", "owned": 2, "total": 6 },
    { "type": "book", "id": "…", "title": "…", "author": "…", "coverUrl": "…" }
  ],
  "quoteOfTheDay": { "text": "…", "page": 214, "book": { "id": "…", "title": "…" } },
  "newOnShelf": [{ "...book": "" }]
}
```

A **book** in any list is `{ id, title, author, format, coverUrl?, series? }`, where `series` is
`{ id, title, number? }` when the book belongs to a series that still exists. An optional field
that is not set is absent, never `null`. `readPerMonth` always has twelve entries, months 1–12,
empty ones included. `yearGoal` and `quoteOfTheDay` are `null` when there is nothing to show;
every list may be empty.

## Definitions

- **readCount** — books with `status: read` and `finishedAt` within the year, any format
  (audiobooks count) and any ownership. A read book without `finishedAt` is not counted; since
  2026-11-26 the server sets it when a book enters `read` ([books.md](books.md)).
- **pagesRead** — for each book that has `pages` and is not an audiobook, its entries in date
  order (ties by insertion): every entry dated within the year adds `max(0, page − previous
  page)`. The previous page is the book's previous entry, even from an earlier year; the first
  entry ever counts from page 0. An entry without `page` reads as `round(percent × pages / 100)`
  with the book's current `pages` (`pageAtPercent` in `services/readingPosition.js`, the rule
  `POST /api/progress` stores pages by). A step back adds nothing and the next step forward
  counts from the lower page — except after the last page: an entry below it after an entry at
  the last page (100%) is a re-read and counts from page 0, so a 400-page book read in 2025 and
  logged at 50, 200 and 400 in 2026 adds 400 to 2026. Entries of a deleted book are ignored. "Finished" writes 100%, which is stored
  as the last page, so it adds the rest of the book.
- **waitingOnShelf** — owned books (`ownership` not `wanted`, absent included) with
  `status: want`.
- **seriesComplete** — `of`: series with at least one owned book. `complete`: of those, the ones
  where every whole number from 1 to `totalBooks` has an owned book; without `totalBooks`, the
  status is `complete` and every whole number up to the highest known number (books of either
  ownership and `expected` entries), and every known number itself (a novella #1.5), has an
  owned book. Stricter than `data-model.md`'s "owned books = `totalBooks`": two copies of #1 do
  not make #2.
- **yearGoal** — present only when the stored goal's `year` is the year asked. `done` equals
  `readCount`; `percent` is `round(done × 100 / target)` and may pass 100 (the client caps the
  ring); `weeksLeft` is `ceil(days from today, today included, to 31 December / 7)`, counted from
  1 January for a future year and 0 for a past one. On 31 December it is 1, never 0.
- **readPerMonth** — the books of `readCount`, by month of `finishedAt`, earliest first, each
  with `rating` when set and `finishedAt`.
- **currentlyReading** — books with `status: reading`, any ownership, with `pages` and
  `startedAt` when set and `progress` (the latest entry: `percent`, `page` when stored, `date`)
  when one exists. Ordered by the latest entry's date, newest first; books without an entry
  follow, newest added first.
- **genres** — owned books only, each genre counted once per book; a book in a series counts the
  series' genres, as `GET /api/books` returns them. Most common first, then by name. Genres are
  compared exactly.
- **waitingForContinuation** — for each series with an owned book and at least one numbered
  book: the next number is the highest number of any of its books (owned or wanted) rounded
  down, plus one. Skipped when the series is `complete` or the number is above `totalBooks`.
  The `expected` entry for exactly that number adds `expectedYear` and `source`. Dated entries
  first by year, then the rest, each by series title.
- **veryMuch** — at most 3, in the wishlist groups of `data-model.md`: series to continue (an
  owned book, and a wanted book or a whole number with no book up to `totalBooks` or the highest
  known number, `expected` included, whichever is larger — the rule of `GET /api/wishlist`'s
  missing segments), then new series (no
  owned book), each with `desire: high` on the series and in the order of `GET /api/series`
  (newest first); then wanted books with `desire: high` and no series (or a deleted one), newest
  first. A series row
  has `owned` and `total` (`totalBooks`, or the number of its books if that is larger) and the
  cover of its lowest-numbered book that has one. A wanted book of a series is represented by its
  series row, never on its own; a wanted book whose series is gone (deleting a series unlinks
  its books in a second write) is shown as a standalone book. `GET /api/wishlist` has its own
  grouping; this is a small local rule that agrees with it on which series want more.
- **quoteOfTheDay** — every quote of every book (owned or wanted), books newest first, quotes in
  their stored order; the one at index `floor(now / 1 day) mod count`. The same quote all UTC
  day, the next one the day after; every quote shows once before any repeats.
- **newOnShelf** — the six most recently added owned books.

"Finished" on Home is two calls the API already has: `POST /api/progress` with `percent: 100`,
then `PATCH /api/books/:id` with `status: read`. The server dates the book today (UTC) when it
has no `finishedAt` ([../designs/auto-reading-dates.md](../designs/auto-reading-dates.md)); a
client that sends the reader's local date as `YYYY-MM-DD` gets that day instead, stored as UTC
midnight, so it lands in the right month whatever the reader's timezone.

## Shape

Part of the books module, like `library` and `progress`: `routes/stats.js` →
`controllers/statsController.js` (validates the query with `validation/statsSchemas.js`, reads
the clock once) → `services/statsService.js` (loads in parallel: every book through
`bookRepository.findAllForUser`, series through `seriesService.listDocs`, every progress entry
through `progressRepository.findAllForUser`, the goal through `yearGoalService.getYearGoal`;
books go through `toBookDto` with their series so genres and legacy defaults match the rest of
the API) → `services/homeStats.js`, a pure function that builds the response field by field and
is unit tested without a database. Errors are not caught; the central handler answers them.

## Frontend consumer

`/dashboard` is Home after sign-in: login, registration and the signed-in logo lead there, `/`
stays the public page, nothing in the nav is active. Design:
[../designs/v3-home.md](../designs/v3-home.md).

- `client/lib/stats.ts`: the response types, `useHomeStats()` (one SWR key, `/api/stats`) and
  `useHomeActions()` — `recordProgress`, `finishBook` (`POST /api/progress` with 100%, then
  `PATCH` with `status: read` and the browser's local date as `finishedAt`) and `saveGoal`
  (`PUT /api/year-goal`). Each revalidates the stats key and every library key.
- `client/components/dashboard/`: `dashboard.tsx` lays the blocks out (one column below 768 px,
  tiles 2 × 2; two columns from 768; the mockup's grid from 1024), `tiles.tsx`, `reading.tsx`
  (Currently reading and "Where are you now?": Pages or Percent — Pages only for a book with
  `pages` that is not an audiobook —, +10 / +25 / +50 capped at the end, Save; an audiobook's
  buttons read "Mark progress" and "Listened"), `goal.tsx` (the ring, "Change goal" / "Set a
  goal": − / number / +, the field may be cleared while typing and the value is held to 1–1,000
  for the hint and on Save, quick 12 · 24 · 36 · 52, "N books left in M weeks, about K a
  week" with K rounded up, "Goal reached" at zero), `months.tsx` (a month with books is a
  button; hovering with a mouse opens its card, which stays open on the way to its links; a
  click or a tap pins it, a second click, Esc or a click elsewhere closes it; the card is
  clamped inside the chart and its arrow points at the month), `lists.tsx` (genres, waiting,
  very much, quote, new on the shelf; four covers below 768 px, six above) and `section.tsx`.
- `client/components/popover.tsx`: a non-modal card with an arrow under its button from 768 px,
  the same
  content in `Drawer` below. First control focused, Esc or a click outside closes, focus back
  to the button, which carries `aria-expanded` and `aria-controls`.
- Every block has its own empty line; a load shows a skeleton with a status line, a failure
  `ErrorState` with Try again. The `500` texts of stats, progress and the goal are translated
  (`client/lib/i18n/server-errors.ts`); texts live under `dashboard` in en / ru / uk.
- The Very much bar shows owned numbers first: the API sends counts, not each number's state.
- While a book is being finished its Mark page and Finished buttons, and an open popover's
  Finished and Save, are disabled, so it is finished once. The installed app opens on
  `/dashboard` (`app/manifest.ts`).

## Data

No collection of its own. Reads `books` (index `{ userId, createdAt }`, newest first, without
the long text fields), `series`, `progress_log` (index `{ userId, date }`) and `users.yearGoal`.
No new index: every query is one user's documents, a few hundred rows.

## Trade-offs accepted

- **UTC, not the reader's timezone.** A date the client sends as `YYYY-MM-DD` buckets exactly.
  A server timestamp (a progress entry) written between midnight and 01:00 or 02:00 in Germany
  lands in the previous day, month or year; the quote and "weeks left" turn over at 01:00 or
  02:00 local time. A `tz` parameter would need DST-aware boundaries without a date library.
- **Books marked read before 2026-11-26 have no `finishedAt`** and are not counted: until then
  nothing wrote it. Falling back to `updatedAt` was rejected: any later edit would move the book
  into the year of the edit. They can be dated by hand (Recovery).
- **A book marked read without a 100% entry** adds only the pages its entries reached.
- **The first entry of a book counts from page 0**, so logging a book already half read counts
  its first half once, this year.
- **A typo is counted.** An entry at page 500 corrected to 50 keeps the 450 extra pages; the
  handoff defines pages as increases between consecutive entries. A typo at the last page
  corrected to a lower one reads as a re-read and counts the lower page again.
- **A re-read is only recognised after the last page.** Starting over from a book left at 60%
  reads as a step back and counts from there, as a correction would.
- **Unnumbered books never complete a series** and never set its next number.
- **Genres are matched exactly**: "Fantasy" and "fantasy" are two bars.
- **Everything is loaded on each request**, all books and all entries, without a cap: a cap
  would cut the totals silently. At hundreds of books and a few entries a week that is a few
  hundred documents.
- **One failing part fails the whole response.** Every block reads the same data.
- **A new quote shifts the day's quote**, as the index runs over the current list.
- **Reading `GET /api/stats` may write**: `seriesService.listDocs` merges the tags of a series
  saved before series-level tags, once, as `GET /api/series` already does.

## Recovery

Nothing to repair: nothing is stored. A book that shows as read but is missing from the count
needs a `finishedAt`; to find them:

```js
db.books.find({ status: "read", finishedAt: null }, { title: 1 })
```

## ADRs

None yet.
