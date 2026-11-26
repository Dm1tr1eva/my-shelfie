# Design: deleting a series hands its genres and tropes to its books

## Problem

- A book of a series is returned with the series' genres and tropes, not its own
  (`server/dto/bookDto.js:43-44`). Deleting the series (`server/services/seriesService.js:84-90`)
  removes the series and then unsets `seriesId` on its books
  (`server/repositories/bookRepository.js:112-115`). The books fall back to their own stored
  tags, which are often empty or stale, so the tags the author saw on them are lost.
- The two writes are separate: a failure between them leaves books pointing at a deleted
  series.

## Out of scope

The series' description, age rating, note and expected numbers; undoing a delete; choosing per
book what to keep.

## Scale assumptions

One user, a series of at most a few hundred books (`findBySeries` reads up to 500), deleted
rarely. One replica of the API; MongoDB Atlas, a replica set, so transactions are available.

## Approach

1. **What a book receives.** Its genres become the series' genres followed by those of its own
   stored genres not already there; the same for tropes. Duplicates are compared ignoring case,
   as genre validation does (`validation/textList.js`). The series' order comes first because
   it is what the book showed while it was in the series.
2. **Limits.** A book takes at most 12 genres and 30 tropes (`validation/bookSchemas.js:61-62`).
   The merged list is cut to that length from the end, so the book's own hidden tags are the
   ones dropped. Storing more would make every later save of the book's tags answer `400`.
3. **One transaction.** `deleteSeries` runs in `mongoose.connection.transaction`: delete the
   series for the user (none → `404` as today), read its books, write each book's merged tags
   and unset `seriesId` and `seriesNumber` in one `bulkWrite`. The
   transaction start lives in `repositories/transaction.js`, so the service does not import
   Mongoose; repository methods keep `userId` first and take the session last.
4. **Client.** The confirmation says the books stay and receive the series' genres and tropes.
   RU and UK use the polite form, as the author decided on 2026-11-26.

The alternative, an aggregation-pipeline `updateMany` with `$setUnion`, lost: it does not keep
order, compares case-sensitively and cannot apply the limits.

## Trade-offs accepted

- **The description is not copied.** A book has its own annotation (v3 decision 21). The
  series' annotation describes the series, and copying it would put the same text on every
  book.
- **The age rating is not copied.** A book shows the series' age while it is in the series
  and falls back to its own afterwards, as today.
- **Tags over the limit are dropped silently.** Reaching it takes a book with its own hidden
  tags plus a series near 12 genres or 30 tropes. Since joining a series adds the book's tags
  to the series, the two rarely differ.
- **A transaction needs a replica set.** A standalone local `mongod` would fail the delete.
  Atlas and every environment in `docs/README.md` are replica sets.

## Cost

- Server: `seriesService.deleteSeries`, one new repository method for books
  (`handOverSeriesTags`), a session option on the series delete, and
  `repositories/transaction.js`.
- Integration tests in `test/library.test.js`. Failure midway is tested without driver mocks:
  a collection validator on the test database rejects one book's write after the series is
  deleted, and the test checks that the series and the books are unchanged.
- Client: the delete text in en, ru and uk, plus one test.
- Docs: `features/series.md` (invariant, endpoint, recovery) and ROADMAP.
- About 150 lines; no dependency, no migration.

## Open questions

- Should a book also keep the series' age rating once the series is gone? One more field in the
  same `bulkWrite`.
