# Design: series size and add-flow fixes

## Problem

- A book added "as a series" stayed standalone. The details step prefills the series title and
  opens the "New series" form, but "Save details" ignored the open form and only the
  separate "Create series" button created it (`client/components/add-details.tsx`).
- A book can hold `seriesNumber` with no `seriesId`: the create schema forbids it, the update
  path does not (`server/validation/bookSchemas.js:42`). The page then reads "Book 1" and
  "Standalone" at once.
- A series has no size. "Own n of m" is `max(highest number, records)`, so owning only #2 of
  five reads "1 of 2" and the missing books never show.
- Search needs a button press; a long trope scrolls inside a one-line field and a duplicate
  disappears without a word; the series "Status" dropdown shares its name with the reading
  status.

## Out of scope

Fetching the titles of a series from anywhere (the AI stage does that), inventing book
records for missing numbers, dark theme, the search page size.

## Scale assumptions

One user, hundreds of books, tens of series.

## Approach

1. **`Series.totalBooks`**, optional integer 1–200, set when creating a series and editable on
   its page. Total is `max(totalBooks, highest number, records)`, so adding #6 to a series of
   five raises it by itself. Numbers with no record are drawn as "missing" tiles and counted in
   "own n of m". Next to buy gets items `{ type: "missing", series, number, gap }` for series
   of which she owns a book and whose size is known; they sort by number with the other series
   items, gaps first, and the language, genre and trope filters drop them (there is nothing to
   match). Alternative rejected: placeholder `Book` records, which would carry invented titles
   into counts and filters.
2. **Save details creates the pending series.** `SeriesPicker` exposes `createPending()`; the
   details step calls it before updating the book. The book page keeps the explicit button.
3. **A number needs a series.** `PATCH { seriesId: null }` clears the number, and a number on
   a book with no series is a `400`. The client never sends one.
4. **Search as you type.** 400 ms after the last keystroke, three characters at least, the
   previous request aborted. Results are replaced when the new ones arrive and dimmed meanwhile;
   "Show more" disappears at once. Enter and the button still search immediately.
5. **Tropes.** The field grows with its text and wraps; a counter shows under ten characters
   left of 60; at 30 tropes adding is refused with a message. Typing a trope already on the book
   shows "Already added", highlights that chip, and keeps the text.
6. **Series state as pills**: "Is the series finished?" with "Still coming out", "Finished",
   "Don't know". Chips and the filter keep Ongoing, Complete, Unknown, the handoff's words.

## Trade-offs accepted

- Missing numbers carry no title until the book is added; filters hide them.
- Save-creates-series only on the details step.
- A book that already holds a number without a series is not repaired; setting its series
  again fixes it.
- Two wordings for the series state, one for choosing and one for showing.
- Old results stay on screen, dimmed, for the moment a new search runs.

## Cost

One model field, no migration (optional). Server: model, schema, DTO, book update rule,
`nextToBuy.js`. Client: pills, tag input, picker, add-book, details, series page, library
counts, next-to-buy row. Roughly 700 changed lines with tests.

## Open questions

None open; the answers were settled in conversation on 2026-10-13.
