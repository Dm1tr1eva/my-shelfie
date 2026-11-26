# Design: the Home stats API

## Problem

Home (`design-v3`, decisions 38–42) needs numbers the API does not compute.
`GET /api/year-goal` and `GET /api/progress` return raw data only
(`server/controllers/yearGoalController.js:6`, `progressController.js:19`).

## Out of scope

Client, AI, `GET /api/wishlist` (built in parallel), new fields.

## Scale assumptions

Hundreds of books, tens of series, a few progress entries a week, one replica.

## Approach

**One endpoint**, `GET /api/stats?year=YYYY`: every block reads the same books and series, so
Home renders from one request. `year` is optional (default: this UTC year), four digits,
2000–2100, the only allowed parameter. It moves the read count, pages, months and goal; the
other blocks describe the shelf now.

**Loading:** all books (no cap: it would cut totals silently), series via
`seriesService.listDocs`, every progress entry (hundreds), the goal. No new index. Books pass through `toBookDto` (series genres, legacy
defaults); a pure `services/homeStats.js` builds the response with explicit fields.

**Definitions (UTC calendar):**

- *Read*: `status: read`, `finishedAt` in the year, any format or ownership.
- *Pages*: per book with `pages`, not audio; each entry dated in the year adds
  `max(0, page − previous page)`. The previous entry may be last year's; the first ever starts
  from 0, as does a lower entry after the last page (a re-read); a missing `page` is
  `round(percent × pages / 100)`. "Finished" writes the last page.
- *Waiting on the shelf*: owned, `status: want`.
- *Series complete*: of series with an owned book, those owning every whole number 1 to
  `totalBooks`; without it, status `complete` and every number up to the highest known
  (books, `expected`) owned.
- *Per month*: the read books by month of `finishedAt`.
- *Goal*: only when `yearGoal.year` is the year asked: `done`, `target`, `percent` (rounded,
  may pass 100), `weeksLeft` (`ceil(days left including today / 7)`, 0 for a past year).
- *Currently reading*: `status: reading` with the latest entry, most recent first.
- *Genres*: owned books, each genre once per book.
- *Waiting for continuation*: series with an owned book; next = highest numbered book + 1,
  with its `expected` entry if any; skipped when `complete` or past `totalBooks`.
- *Very much*: the wishlist groups with `desire: high`, at most 3; gaps as `GET /api/wishlist`.
- *Quote of the day*: all quotes as loaded; index = UTC days since 1970 mod count.
- *New on the shelf*: 6 newest owned books.

**"Finished"** stays two existing calls: `POST /api/progress` with 100%, and `PATCH` the book
to `read` with `finishedAt` as the reader's local `YYYY-MM-DD`. The client knows the reader's
day; the server would stamp a UTC one.

## Trade-offs accepted

- **UTC.** A `YYYY-MM-DD` date buckets exactly; a server timestamp near midnight lands up to
  two hours early for a reader in Germany. A `tz` parameter needs DST-aware code.
- **A read book without `finishedAt` is not counted.** The current client never writes it.
- **The first entry counts from page 0**: logging a half-read book counts its first half.
- **Unnumbered books never complete a series** or set its next number.
- **Genres match exactly**: "Fantasy" and "fantasy" are two bars.
- **A new quote shifts the day's quote.**

## Cost

Route, controller, service, pure builder, schema, two repository methods, 45 tests.

## Review

Kept against the "cut" pass: `year` and the second completeness rule (the brief and
`data-model.md` ask for them), the local Very much (the brief forbids depending on the
wishlist), the percent fallback (`pages` can arrive after entries). Shapes and ties:
[../features/home-stats.md](../features/home-stats.md).

## Open questions

- Should `PATCH status: read` date the book itself? *Resolved: yes,*
  [auto-reading-dates.md](auto-reading-dates.md).
- Should "Series complete" count series without an owned book?
