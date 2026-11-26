# Feature: series and ownership

**Last verified against code:** 2026-11-26

## What it does

Turns the shelf into a catalogue. A book is either owned or wanted; a book can belong to a
series with a number; a series has its own status and note. What is wanted next, series by
series, is the wishlist ([wishlist.md](wishlist.md)). Design and reasons: [library-and-wishlist.md](../designs/library-and-wishlist.md).

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
| `PATCH /api/series/:id` | `200` with the updated series. `null` clears `author`, `note`, `totalBooks` and `annotation`; `null` for `ageRating`, `desire` or `expected` answers `400`. `404` as above. |
| `DELETE /api/series/:id` | `204`. The books are kept and unlinked. `404` as above. |
| `GET /api/wishlist` | The v3 wishlist in three groups, see [wishlist.md](wishlist.md). |
| `GET /api/tropes` | `200` with `{ tropes }`: the user's own tropes, each once, sorted. Feeds suggestions in the tag input. |
| `GET /api/books` | Gains `?ownership=owned\|wanted`, `?seriesId=`, `?genre=`, `?trope=` and `?q=` (a case-insensitive text match on title and author, treated as plain text). `400` on an invalid value. |

**What "absent" and `null` mean on a book:** `PATCH` with `seriesId: null` and
`seriesNumber: null` takes the book out of its series; the same goes for `notes` and
`annotation`. The arrays `genres`, `tropes` and `links` are replaced as a whole, and an empty
array clears them.

## Missing numbers

The Library has its own rule ([v3-library.md](../designs/v3-library.md)): every whole number up to the largest of
`totalBooks`, the highest book number and the highest `expected` number that has no book, owned
or wanted, is missing, and each run of them is one dashed gap tile, which shows the earliest
`expectedYear` its numbers have in `expected` ("Not before 2027").

## Data

`Series` (`server/models/series.js`): `userId`, `title`, `author`, `status`
(`ongoing | readable | complete | unknown`; `readable` is a series still coming out whose books so
out far can be read as they are, see [../designs/readable-series.md](../designs/readable-series.md)), `note`, `totalBooks` (optional whole number, 1 to 200: how
many books the series has or has announced), `genres` (free text: 1 to 40 characters, up to 12, unique ignoring case), `tropes` (up to 30, 60
characters each), `annotation` (up to 5000 characters), `ageRating` (`none | 12 | 16 | 18`,
default `none`), `desire` (`high | normal | someday`, default `normal`, for the wishlist row of
the series), `expected` (up to 50 `{ number, expectedYear?, source }`: a number above 0, unique
in the list; a whole year from 1900 to 2200; `source` one of `fantlab | ai | manual`, where `ai` marks a
number taken from [series lookup](series-lookup.md); replaced as a whole, `[]` empties it), `tagsMerged` (internal), timestamps; index `{ userId, createdAt }`.
Series saved before the v3 fields read with the defaults and an empty `expected`. A book of the
series is returned with the series' `ageRating` when it is set (not `none`), otherwise with its
own. Design:
[../designs/v3-data-model.md](../designs/v3-data-model.md).

`Book` gains `ownership` (`owned | wanted`), `seriesId`, `seriesNumber`, `genres` (the same
rule as on a series, in `validation/genre.js`), `tropes`, `links` (`{ kind, languages, url }` with `kind` one of `paper | ebook | audio | free | online`,
default `paper`; `languages` 1 to 4 distinct values of `ru | uk | en | other`; http(s) only — a
body with the old single `language` answers `400`, and a link stored before reads as
`languages: [language]`), `notes` and `annotation`; index `{ userId, seriesId, seriesNumber }`. The
client offers a list of defaults (`DEFAULT_GENRES` in `lib/books.ts`) plus every genre
the user's own books and series use (`lib/genres.ts`), and a field to add another.
Design: [../designs/custom-genres.md](../designs/custom-genres.md).

## Trade-offs accepted

- **Counts come from one aggregation per list request**, not stored on the series, so they can
  never disagree with the books. At a few hundred books this is cheap.
- **The wishlist's query is capped at 2,000 books** (`findForWishlist`). A personal shelf is
  far below that.
- **No uniqueness on series titles.** Two series may share a title; the author tells them
  apart by author and notes.
- **Genres and tropes live on the series; the annotation stays the book's.** A book with a
  `seriesId` is returned with the series' values in `genres` and `tropes` (the overlay is
  `toBookDto(book, series)`); the values stored on the book are kept and come back if it leaves
  the series. Its `annotation` is always its own (v3 decision 21, since 2026-11-26; before
  that the series' description was returned in its place), and the series' description is the
  series' `annotation`, shown on the series page. Putting a book into a series adds its genres
  and tropes to the series and gives the series the book's annotation as a description if it
  has none. A series saved before this took the union
  of its books' tags the first time it was read and was marked `tagsMerged`; one created
  through the API is born merged, so tags an author removes are not brought back. Design:
  [series-tags.md](../designs/series-tags.md).
- **A trope cannot be true of one book of a series only.**
- **A missing number has no title.** Only the count of the series is stored, not its list of
  titles, so a gap says "#4" until the book is added. Fetching titles belongs to the AI stage.
- **An expected number stays when its book arrives.** `expected` is not cleaned when a book with
  that number is added; whoever reads it skips numbers that have a book.
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

None for user series. The shared series lookup cache: [ADR 0001](../adr/0001-shared-reference-data.md).
