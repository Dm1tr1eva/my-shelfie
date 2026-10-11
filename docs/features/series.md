# Feature: series, ownership and "next to buy"

**Last verified against code:** 2026-10-11

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
- A `seriesNumber` without a `seriesId` is rejected on create.
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
| `POST /api/series` | `201` with the series. `400` on an empty title, an unknown status or an unrecognised field. |
| `GET /api/series` | `200` with `{ series }`, each with `ownedCount` and `wantedCount`, newest first. |
| `GET /api/series/:id` | `200` with `{ series, books }`; books by number, unnumbered last. `404` for a missing, foreign or malformed id. |
| `PATCH /api/series/:id` | `200` with the updated series. `null` clears `author` and `note`. `404` as above. |
| `DELETE /api/series/:id` | `204`. The books are kept and unlinked. `404` as above. |
| `GET /api/next-to-buy` | `200` with `{ items }`. Filters: `language` (`ru`, `uk`, `en`, `other`), `genre`, `trope`, `seriesStatus`. `400` on an unknown value. |
| `GET /api/tropes` | `200` with `{ tropes }`: the user's own tropes, each once, sorted. Feeds suggestions in the tag input. |
| `GET /api/books` | Gains `?ownership=owned\|wanted`, `?seriesId=`, `?genre=`, `?trope=` and `?q=` (a case-insensitive text match on title and author, treated as plain text). `400` on an invalid value. |

**What "absent" and `null` mean on a book:** `PATCH` with `seriesId: null` and
`seriesNumber: null` takes the book out of its series; the same goes for `notes` and
`annotation`. The arrays `genres`, `tropes` and `links` are replaced as a whole, and an empty
array clears them.

## "Next to buy"

Over the user's wanted books, computed in `services/nextToBuy.js` as a pure function:

1. Group wanted books by series. From each group take the lowest-numbered book (a book with no
   number counts as last, ties by age). Books with no series are standalone items.
2. Keep an item if its chosen book matches the filters: a link in the language, the genre, the
   trope; and, for `seriesStatus`, if its series has that status (standalone items then drop
   out).
3. Sort starred items first (a series' `priority`, or a standalone book's), then the most
   recently added: the series' `createdAt`, or the book's.

Each item is `{ type: "series" | "standalone", series?, book, wantedCount? }`. Because filters
apply to the chosen book, a series whose next book has no link in the language is hidden rather
than replaced by a later book: buying out of order is not what the list is for.

## Data

`Series` (`server/models/series.js`): `userId`, `title`, `author`, `status`
(`ongoing | complete | unknown`), `note`, `priority`, timestamps; index `{ userId, createdAt }`.

`Book` gains `ownership` (`owned | wanted`), `seriesId`, `seriesNumber`, `genres` (from the
fixed list in `server/constants/library.js`), `tropes`, `links` (`{ language, url }`, http(s)
only), `notes`, `annotation` and `priority`; index `{ userId, seriesId, seriesNumber }`. The
client keeps its own copy of the genre list.

## Trade-offs accepted

- **Counts come from one aggregation per list request**, not stored on the series, so they can
  never disagree with the books. At a few hundred books this is cheap.
- **The wanted-books query is capped at 1,000.** A personal wishlist is far below that.
- **No uniqueness on series titles.** Two series may share a title; the author tells them
  apart by author and notes.
- **Genres and tropes live on books**, so a series' tags are the union of its books'.
- **A series' `priority` and a standalone book's `priority` are different fields on different
  documents**; a star on a book inside a series is stored but ignored by "next to buy".

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
