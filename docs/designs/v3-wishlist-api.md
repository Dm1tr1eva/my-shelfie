# Design: the wishlist endpoint

## Problem

The v3 Wishlist (handoff decisions 32–34) draws three groups of rows with segments and a desire
pill. `GET /api/next-to-buy` (`services/nextToBuy.js:38`) answers one flat list of
books and missing numbers, leaves out series with nothing owned (`nextToBuy.js:59`) and ignores
`desire`.

## Out of scope

Client changes, removing `/api/next-to-buy`, the AI, home stats.

## Scale assumptions

Hundreds of books and tens of series per user; one read per page visit; one replica.

## Approach

`GET /api/wishlist` → `{ groups: [{ key, count, items }] }`, three groups, always in this
order: `continue`, `newSeries`, `standalone`. `count` (`items.length`) is kept: the brief asks
for it. Any query parameter answers `400`. A failure answers `500 Failed to build the list`,
which the client already translates.

A pure function, `services/wishlist.js`, over Next to buy's inputs (`findForNextToBuy`,
`seriesService.listDocs`, the DTOs), both scoped by `userId`; `libraryService` loads them.

**Segments**, ascending, one per number. A series' numbers are its books' numbers, its
`expected` numbers, and every whole number from 1 to the larger of `totalBooks` and the highest
of those. A number is `owned` if an owned book (no `ownership` counts as owned) has it, else
`wanted` if a wanted book does, else `missing`. Unnumbered books follow as
`{ number: null, state }`, oldest first. The client draws at most ten.

**Groups.** A series with an owned book and at least one `wanted` or `missing` segment is
`continue`; one without an owned book is `newSeries`; a series owning everything is left out.
A wanted book with no series, or whose series is gone, is `standalone`.

**Order.** Desire `high`, `normal`, `someday` (series rows by `Series.desire`, books by
`Book.desire`; a missing value counts as `normal`). Ties: series by title (`localeCompare`),
books newest first by `createdAt`; then by id, so the order never depends on the database.

**Rows.** Series: `type: "series"`, `id`, `title`, `author?`, `status`, `desire`, `coverUrl?`,
`segments`. Cover: from the series' book, owned or wanted, with the lowest number that has
one, unnumbered last; none means the placeholder. Book: `type: "book"`, `id`, `title`,
`author`, `desire`, `coverUrl?`, `format` (the cover badge).

**Search and filters stay in the browser**, as in the library: the panel's live "Show N" count
(decision 36) needs no round trip per click. Each row carries the library's filter values
(`client/lib/filters.ts:7`): `genres`, `tropes` (a series' own), `linkLanguages`, `linkKinds`
(distinct; for a series, from its wanted books' links); `author` and series `status` are
already there. Age has no client filter yet; adding it is one field.

**Desire** changes through the existing `PATCH /api/series/:id` and `/api/books/:id`.

**Next to buy** stays untouched until the client half of step 7 stops calling it; that step
deletes the route, `nextToBuy.js` and its tests.

## Trade-offs accepted

- **A series with no books and no size is in New series** with zero segments (the handoff's
  rule).
- **Search matches a row's own title and author**, not the titles of a series' books.
- **No format, reading status, rating or "Have" filter values**: a series row has no single
  format, and the rest describe owned books.
- **A fractional number widens nothing.** `2.5` gets its own segment, but only whole numbers
  are filled in as `missing`.
- **Segments are not capped.** `seriesNumber` has no upper bound (`bookSchemas.js:60`), so a
  book numbered 2019 by mistake sends 2,019 segments. Bounding it is a validation change of
  its own, flagged as a follow-up.

## Cost

One service, one controller function, route and schema; about 30 tests, two cross-user. No
model change, no dependency.

## Open questions

- Should a fully owned but still `ongoing` series appear in Continue without `expected`?
