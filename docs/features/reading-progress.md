# Feature: reading progress and the year goal

**Last verified against code:** 2026-11-26

## What it does

Stores where the reader is in a book, as a log of dated entries, and how many books she means
to read this year. Both feed the v3 Home page ("Mark page", "Where are you now?", "Finished",
the goal ring and "Pages this year"); the numbers Home shows are derived by `GET /api/stats`
([home-stats.md](home-stats.md)). The book panel shows the latest entry of a book as a bar and
a percent (`lib/progress.ts`, `useBookProgress`) and never writes one. Design:
[../designs/v3-data-model.md](../designs/v3-data-model.md).

## Invariants

- An entry belongs to exactly one user and one of that user's books, both set by the server:
  `userId` from the session, the book checked to be hers before anything is written.
- An entry always has a `percent` from 0 to 100. When the book has `pages`, it also has a `page`
  from 0 to `pages`: given a page, `percent = floor(page / pages × 100)` (only the last page is
  100%); given a percent, `page = round(percent × pages / 100)`.
- A book's current progress is its latest entry by `date`; ties go to the later insert.
- An entry for a book the reader owns (`ownership` not `wanted`; books saved without it read as
  owned) whose status is `want` moves the book to `reading`, through `bookService.updateBook`,
  so the reading-dates rule sets `startedAt` to today when the book has none. No other status
  changes: a `reading` book stays as it is, a `read` or `dropped` one is not brought back, a
  wishlist book stays planned, and 100% does not mark a book read — "Finished" does that.
- Deleting a book deletes its entries.
- The goal is one `{ year, books }` per user. Setting it replaces the previous one, whatever its
  year.

## Endpoints

All require a session (`401` otherwise). Bodies are strict: an unknown field answers `400`.

| Method and path | Answers |
|---|---|
| `POST /api/progress` | `201` with `{ id, bookId, date, page?, percent }` — the entry only, also when it moved the book to `reading`; the client refetches the book. The body is `bookId` and exactly one of `page` (whole, 0–10,000) or `percent` (whole, 0–100). `400` for both or neither, a value out of range, a malformed `bookId`, a `page` for a book without `pages`, or a `page` past the book's `pages`. `404` for a book that does not exist or belongs to someone else. `date` is the server's time; the client cannot send one. |
| `GET /api/progress` | `200` with `{ entries }`: the latest entry of each of the caller's books that has one, newest first. |
| `GET /api/year-goal` | `200` with `{ yearGoal: { year, books } }`, or `{ yearGoal: null }` before one is set. A goal for a past year is returned as it is; showing "no goal this year" is the client's call. |
| `PUT /api/year-goal` | `200` with `{ yearGoal }`. The body is `{ year, books }`: whole numbers, `year` 2000–2100, `books` 1–1,000. `400` otherwise. `404` if the account behind the session no longer exists. |

## Shape

Progress is part of the books module: `controllers/progressController.js` →
`services/progressService.js` (ownership check through `bookRepository`, page/percent rules) →
`repositories/progressRepository.js`. `bookService.deleteBook` removes the entries through the
same repository. The goal has its own small module — `controllers/yearGoalController.js` →
`services/yearGoalService.js` → `repositories/userRepository.js`, which `auth` shares since
2026-11-26.

## Data

`ProgressEntry` (`server/models/progressEntry.js`), collection `progress_log`: `userId`,
`bookId`, `date` (default now), `page` (optional, ≥ 0), `percent` (0–100). Indexes
`{ userId: 1, date: -1 }` (entries of a year, for "Pages this year") and
`{ userId: 1, bookId: 1, date: -1 }` (latest per book). `User.yearGoal`: `{ year, books }`,
absent until set.

## Trade-offs accepted

- **Deleting a book and its entries are two writes, not a transaction.** If the second fails,
  the book is already gone but `DELETE /api/books/:id` answers `500`; a retry then answers
  `404`. The entries are orphans: `GET /api/progress` still returns them, but they match no book
  the client holds. The query under Recovery removes them.
- **Changing a book's `pages` does not recompute old entries.** The latest entry is what shows,
  and the next one uses the new count.
- **A progress entry starts an owned planned book and nothing else.** Marking a page of a book
  on the shelf means reading it; marking one of a wishlist book does not mean it was bought, so
  that stays the reader's own change. "Finished" on Home sends the 100% entry and then
  `PATCH`es the book to `read`; the server sets `finishedAt` to today (UTC) when
  the book has none, or keeps the reader's local `YYYY-MM-DD` if the client sends it —
  [../designs/auto-reading-dates.md](../designs/auto-reading-dates.md). If the `PATCH` fails
  after the entry, the book shows 100% and stays `reading` until the client retries.
- **The entry and the status change are two writes.** If moving the book to `reading` fails
  after the entry is saved, the request answers `500` with the entry kept; the next entry
  moves the book. No transaction: a failure between two single-document writes has no user
  action behind it.
- **One goal, no history.** Nothing in the design shows past goals; a map of year → books can
  replace the field if that changes.
- **No rate limit.** Each tap on "Mark page" is one entry; a few a day per book is the scale.

## Recovery

Entries whose book is gone:

```js
db.progress_log.deleteMany({ bookId: { $nin: db.books.distinct("_id") } })
```

## ADRs

None yet.
