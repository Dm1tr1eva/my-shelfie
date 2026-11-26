# Feature: the wishlist

**Last verified against code:** 2026-11-26

## What it does

Answers "what do I want to get next" in the three groups the v3 Wishlist page draws: series to
continue, series not started yet, and books outside any series, each ordered by how much the
reader wants them. One request carries everything a row needs, segments included, so the page
draws and filters without further calls. It replaces "Next to buy"
([series.md](series.md)) once the client half of v3 step 7 lands; until then both endpoints
answer. This is the API only. Design: [../designs/v3-wishlist-api.md](../designs/v3-wishlist-api.md).

## Invariants

- Only the session user's series and books are read; a book of another user can neither appear
  nor change the state of a segment, even if it points at one of the reader's series.
- Always three groups, in the order `continue`, `newSeries`, `standalone`, each with
  `count === items.length`.
- A series is in at most one group: `newSeries` when no book of it is owned; `continue` when one
  is owned and some segment is `wanted` or `missing`; nowhere when every segment is `owned`.
- A book without `ownership` counts as owned, as everywhere else; a wanted book is
  `standalone` only when it has no series or its series no longer exists.
- Segments ascend by number, one per number: `owned` beats `wanted` beats `missing`. The numbers
  are the books' numbers, the `expected` numbers, and every whole number from 1 to the larger of
  `totalBooks` and the highest of those, but no further than 999 (`SERIES_NUMBER_MAX`). A
  fraction keeps its own segment: `expected` `2.5` after an owned `1` gives `1`, `2`, `2.5`. An
  owned book without a number counts as owned for the group. Unnumbered books follow as `number: null`, oldest
  first.
- Order inside a group: desire `high`, `normal`, `someday` (a series row by `Series.desire`, a
  book row by `Book.desire`; the models' default gives an old document `normal`); then
  series by title (`localeCompare`), books newest first; then by id.

## Endpoints

Requires a session (`401` otherwise).

| Method and path | Answers |
|---|---|
| `GET /api/wishlist` | `200` with `{ groups }`. `400` with `query: Unrecognized key: "…"` for any query parameter. `500 Failed to build the list` on an unexpected failure, the text Next to buy already uses. |

A series row: `{ type: "series", id, title, author?, status, desire, coverUrl?, segments,
genres, tropes, linkLanguages, linkKinds }`. A book row: `{ type: "book", id, title, author,
desire, coverUrl?, format, genres, tropes, linkLanguages, linkKinds }`. Absent `author` or
`coverUrl` means none is stored; the client draws the placeholder cover. `coverUrl` of a series
is that of its book, owned or wanted, with the lowest number that has one. `genres` and `tropes`
of a series are its own; `linkLanguages` and `linkKinds` are distinct values from the links of
its wanted books, or of the book itself.

```json
{
  "groups": [
    {
      "key": "continue",
      "count": 1,
      "items": [
        {
          "type": "series",
          "id": "6745a1…",
          "title": "Saga",
          "author": "Writer",
          "status": "ongoing",
          "desire": "high",
          "coverUrl": "https://…/1.jpg",
          "segments": [
            { "number": 1, "state": "owned" },
            { "number": 2, "state": "wanted" },
            { "number": 3, "state": "missing" }
          ],
          "genres": ["Fantasy"],
          "tropes": [],
          "linkLanguages": ["uk"],
          "linkKinds": ["ebook"]
        }
      ]
    },
    { "key": "newSeries", "count": 0, "items": [] },
    { "key": "standalone", "count": 0, "items": [] }
  ]
}
```

Search and filters run in the browser over this response. The desire level changes through
`PATCH /api/series/:id` and `PATCH /api/books/:id` (`desire`, see [series.md](series.md) and
[books.md](books.md)); the client refetches the wishlist afterwards.

Code: `services/wishlist.js` (a pure function over the book and series DTOs),
`libraryService.wishlist`, `libraryController.wishlist`, `routes/library.js`.

## Data

Owns nothing. Reads `books` through `bookRepository.findForNextToBuy` (wanted books and books in
a series, capped at 2,000) and `series` through `seriesService.listDocs`, the same inputs as
Next to buy.

## Trade-offs accepted

- **A series with no books and no size is in New series** with zero segments, by the handoff's
  rule. Delete it from its page if it is not wanted.
- **A fully owned `ongoing` series without `totalBooks` or `expected` is left out**: nothing
  says another book exists. Recorded as an open question in the design.
- **Search matches a row's own title and author**, not the titles of a series' books.
- **No format, reading status, rating or "Have" filter values**: a series row has no single
  format, and the rest describe owned books. Age is not sent either: the client has no age
  filter yet.
- **Gaps stop at 999.** A number in the millions stored by mistake before the request limit
  once took two seconds and then a `500` (`Set maximum size exceeded`), and the one replica
  serves everyone; now it stays a single segment and nothing past 999 is filled in. A series
  numbered past 999 on purpose shows its numbers without the gaps between them.

## Recovery

Nothing is stored, so nothing drifts. A wrong row is fixed at its source: the series' size or
`expected` list, or a book's number or ownership.

## ADRs

None yet.
