# Design: the author's first notes from using the app

## Problem

Five notes and two screenshots from the author's own use, 2026-10-13
(`docs/ROADMAP.md`, "Notes from the author's own use"):

- After adding a book from search, the next step is a toast with a link; the author wants the
  details step at once (`add-book.tsx`, the `added` toast).
- A book of a series has no way to add its sibling; the series field lists matching series only
  after typing, and choosing one fills genres but not tropes.
- "Where to buy" is shown for books already on the shelf, where it makes no sense; its "Add
  link" button wraps onto two lines (`book-page.tsx`).
- Library groups are alphabetical with standalone books last; the author wants standalone books
  first and the newest series above older ones.

## Out of scope

Reordering groups by hand, copying links between books of a series, bulk add.

## Scale assumptions

One user, hundreds of books; everything is computed on the client from the loaded list.

## Approach

1. **Straight to details.** Adding a book from search or by hand opens
   `/add/[id]/details` (with the series and number when the page was opened for a series).
   "Skip for now" is already there. "Move to library" for a book already on the wishlist keeps
   the toast: the book has its details.
2. **Add a book to this series.** On a book page that has a series, a button opens
   `/add?series=<id>&number=<next>`, which together with 1 lands on the series fields of the new
   book, prefilled.
3. **Series list and what it fills.** A chevron opens the whole list of the user's series, even
   with text in the field. Choosing one fills genres and tropes from the series' other books,
   as defaults until the author edits the field, on the details step and on the book page.
   Shop links are per book and are not copied.
4. **Links only on the wishlist.** "Where to buy" and the link editor show for a wanted book
   only; links already stored on an owned book stay and come back if it returns to the wishlist.
5. **Group order.** Standalone books first, then series by the time their most recent book was
   added, newest on top; ties by title. This applies to the Library and the Wishlist.
6. **"Add link" button** stays on one line.

## Trade-offs accepted

- Straight to details costs an extra page for a bulk import; "Skip for now" goes to the
  library, not back to search. The alternative (stay on search) was rejected because the
  author found the toast easy to miss.
- Tropes are the union of the siblings', so one odd trope on one book is offered for all.
- Order by latest book moves a series up whenever a book is added to it.

## Cost

No server change. Edited: `catalogue.ts`, `library.tsx`, `add-book.tsx`, `add-details.tsx`,
`book-page.tsx`, `series-picker.tsx` and their tests; roughly 400 changed lines.

## Open questions

None.
