# Feature: series, ownership and "next to buy"

**Last verified against code:** 2026-10-13

## What it does

Turns the shelf into a catalogue. A book is either owned or wanted; a book can belong to a
series with a number; a series has its own status and note. On top of that, "next to buy" answers
the question the author asks before spending money: which book should I buy next, series by
series. Design and reasons: [library-and-wishlist.md](../designs/library-and-wishlist.md).

## Invariants

- A series, like a book, belongs to exactly one user, set from the session and never from the
  request body. Another user's series is indistinguishable from a missing one (`404`).
- A book can only point at a series of the same user. Creating or updating a book with another
  user's `seriesId` answers `400`.
- A `seriesNumber` without a `seriesId` is rejected: on create by the schema, on update by
  the book service. Taking a book out of its series (`seriesId: null`) clears the number with it.
  Books saved before this rule may still hold a number with no series; the client ignores it.
- A book stored without `ownership` is owned. Queries never match on `ownership: "owned"`;
  they exclude `"wanted"`.
- Reading status and ownership are independent: a wanted book may be marked read, and an owned
  one may be "want to read".
- Deleting a series never deletes books: they lose `seriesId` and `seriesNumber` and become
  standalone.

## Endpoints

Everything requires a session (`401` otherwise).

| Method and path | Answers |
|---|---|
| `POST /api/series` | `201` with the series. `400` on an empty title, an unknown status, a `totalBooks` that is not a whole number from 1 to 200, or an unrecognised field. |
| `GET /api/series` | `200` with `{ series }`, each with `ownedCount` and `wantedCount`, newest first. |
| `GET /api/series/:id` | `200` with `{ series, books }`; books by number, unnumbered last. `404` for a missing, foreign or malformed id. |
| `PATCH /api/series/:id` | `200` with the updated series. `null` clears `author`, `note` and `totalBooks`. `404` as above. |
| `DELETE /api/series/:id` | `204`. The books are kept and unlinked. `404` as above. |
| `GET /api/next-to-buy` | `200` with `{ items }`. Filters: `language` (`ru`, `uk`, `en`, `other`), `genre`, `trope`, `seriesStatus`. `400` on an unknown value. The page does not send them: it fetches once and filters several values per group in the browser. |
| `GET /api/tropes` | `200` with `{ tropes }`: the user's own tropes, each once, sorted. Feeds suggestions in the tag input. |
| `GET /api/books` | Gains `?ownership=owned\|wanted`, `?seriesId=`, `?genre=`, `?trope=` and `?q=` (a case-insensitive text match on title and author, treated as plain text). `400` on an invalid value. |

**What "absent" and `null` mean on a book:** `PATCH` with `seriesId: null` and
`seriesNumber: null` takes the book out of its series; the same goes for `notes` and
`annotation`. The arrays `genres`, `tropes` and `links` are replaced as a whole, and an empty
array clears them.

## "Next to buy"

Computed in `services/nextToBuy.js` as a pure function over the user's series and the books
that are wanted or belong to a series:

1. For each series of which the user owns **at least one** book, take **all** its wanted books.
   A series she owns nothing of is left out; it is not "started".
2. A wanted book is a **gap** when its number is below the highest number she owns in that
   series (own #1 and #3 → #2 is a gap). A wanted book with no number is never a gap.
3. A wanted book that belongs to no series (or whose series is gone) is a standalone item.
4. Keep an item if its book matches the filters: a link in the language, the genre, the trope;
   and for `seriesStatus`, if its series has that status (standalone items then drop out).
5. Order: gaps first; then the other series books, series by title and books by number
   (unnumbered last); then standalone books, newest first.

Each item is `{ type: "series" | "standalone", series?, book, gap }`, or, for a number of a
series whose size is known, `{ type: "missing", series, number, gap }` with no book. "I bought
it" is a `PATCH` of the book's `ownership` to `owned`; the book then leaves the list on its own.

6. For a series she has started and whose `totalBooks` is set, every whole number from 1 to
   `totalBooks` with no book record at all is a `missing` item. It is a gap when it is below
   her highest owned number. The language, genre and trope filters drop `missing` items (there
   is nothing to match); `seriesStatus` keeps them. They sort among the series' books by number.

Without `totalBooks` a number with no record cannot appear here; the Library draws such a gap
as a dashed tile from the series' numbers.

## Data

`Series` (`server/models/series.js`): `userId`, `title`, `author`, `status`
(`ongoing | complete | unknown`), `note`, `totalBooks` (optional whole number, 1 to 200: how
many books the series has or has announced), timestamps; index `{ userId, createdAt }`.

`Book` gains `ownership` (`owned | wanted`), `seriesId`, `seriesNumber`, `genres` (from the
fixed list in `server/constants/library.js`), `tropes`, `links` (`{ language, url }`, http(s)
only), `notes` and `annotation`; index `{ userId, seriesId, seriesNumber }`. The
client keeps its own copy of the genre list.

## Trade-offs accepted

- **Counts come from one aggregation per list request**, not stored on the series, so they can
  never disagree with the books. At a few hundred books this is cheap.
- **The wanted-books query is capped at 1,000.** A personal wishlist is far below that.
- **No uniqueness on series titles.** Two series may share a title; the author tells them
  apart by author and notes.
- **Genres and tropes live on books**, so a series' tags are the union of its books'.
- **A series you have not started never shows up.** A new wishlist series appears in "Next
  to buy" only after you own one of its books, as the design intends.
- **A missing number has no title.** Only the count of the series is stored, not its list of
  titles, so `missing` items say "Book 4" until the book is added. Fetching titles belongs to
  the AI stage.
- **The size is the author's word.** It is not checked against anything; a book numbered above
  it raises the total shown, it does not fail.

## Recovery

Books saved before this feature have no `ownership`, no tags and no links; they read as owned
with empty arrays and need no repair. A series whose books were all removed stays in the list
with zero counts; delete it from its page. To find books pointing at a deleted series, which
should not occur because deleting unlinks them:

```js
db.books.find({ seriesId: { $nin: db.series.distinct("_id") }, seriesId: { $exists: true } })
```

## ADRs

None yet.
