# Design: genres, tropes and description live on the series

## Problem

- Genres, tropes and the annotation are stored on every book. Books of one series drift
  apart, and the client has to infer the series' tags from its siblings
  (`add-details.tsx`, `seriesGenres` and `seriesTropes`; `book-page.tsx`, `chooseSeries`).
- The author's Notion table keeps all three once per series; the app asks for them again on
  each book.

## Out of scope

Extra tropes on a single book of a series, a separate description per book of a series,
copying shop links between books, editing tags of many series at once.

## Scale assumptions

Hundreds of books, tens of series, one user; a series read loads at most a few hundred books.

## Approach

1. **Fields.** `Series` gains `genres` (from the fixed list), `tropes` (up to 30, 60
   characters each) and `annotation` (up to 5000 characters), editable on the series page.
2. **The book DTO shows the series' values.** For a book with a `seriesId`, the response's
   `genres`, `tropes` and `annotation` are the series'; the book's own stored values stay in
   the database and are what a standalone book uses. One overlay, `toBookDto(book, series)`,
   so lists, filters, tiles, Next to buy and `/api/tropes` need no change of their own.
   `/api/tropes` adds the series' tropes.
3. **Putting a book into a series merges, never drops.** On create with a series, or an
   update that sets a different `seriesId`, the book's genres and tropes are added to the
   series (a union; if the series had none they become its tags) and its annotation becomes the
   series' when the series has none.
4. **Existing data, once.** A series not yet merged (`tagsMerged` unset) takes the union of
   its books' genres and tropes and the first annotation it finds the first time it is read,
   and is saved with the flag set. A series created through the API is born merged, so an
   author who later empties its tags is not overridden.
5. **Editing.** A book of a series shows the series' chips and description read-only with a
   link to the series. The details step edits the series' tags when the book has a series.
   Sending tags with a book update that is in a series stores them on the book and is
   otherwise ignored.

## Trade-offs accepted

- A trope cannot be true of one book of a series only.
- Removing a trope from a series while a book still stores it does not bring it back: the
  merge runs only when a book is linked.
- The first read of an unmerged series costs one query per series, once.
- A standalone book that joins a series loses its own description from view in favour of the
  series' (its text is kept on the book).

## Cost

Server: model, schema, DTO, series and book services, library service, `/api/tropes`. Client:
series page edit form, book page, details step, types. Roughly 600 changed lines with tests.
No migration script.

## Open questions

None; the three choices were settled in conversation on 2026-10-13.
