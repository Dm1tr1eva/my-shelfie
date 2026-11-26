# Design: v3 library

## Problem

`/library` shows owned books only (`components/library.tsx`, `isInTab`), with tabs, a stats
line, a view toggle, series notes, gaps below the highest owned number only
(`lib/catalogue.ts:gapNumbersOf`) and filter popovers. The v3 handoff (decisions 7–13, 35–37)
wants one library of all books.

## Out of scope

Book panel, series page, add modal, wishlist, home, server, "Listening" for audiobooks.
`/wishlist`, `/next` stay v2 until the Wishlist step.

## Scale assumptions

Hundreds of books, tens of series, derived in the browser.

## Approach

**Shelves** (`lib/shelves.ts`). A series shelf lists its books by number, unnumbered last.
Numbers run to the largest of `totalBooks`, the highest whole book number and `expected`
number; each run of whole numbers with no book is one gap `#4–6`, with its numbers' earliest
`expectedYear` ("Not before 2027", from 768px). Segments: one per book and per missing number.
Series come newest-first, then "Standalone books" by title.

**Rows.** Seven columns from 64rem, four below (`matchMedia` on `lg:`'s query). A series that
fits shows whole, seven slots included; a longer one shows `columns − 1` and `+N more` (hidden
books and missing numbers), as `library-1440` draws, not `screens.md`'s "5 + a tile".
Standalone books wrap, a shelf bar per row.

**Tiles** (`library-tiles.tsx`): fixed height, cover, a two-line title, one meta line (status
and rating, or "In wishlist" with a dimmed cover); below 768px text is for screen readers. A
cover opens `/books/[id]`, a gap `/add?series=…&number=<first>`, `+N more` and the series
header `/series/[id]`.

**SeriesSegments**: at most ten 16/12×6px bars and a muted `+N`, `role="img"` "Own 2 of 6".

**Search and filters** narrow books by title, author or series title; a series with no matching
book disappears. Gaps stay under search and series-wide groups (genre, tropes, age, series
status, author) as in `filters-1440`, and hide under per-book groups (have, status, format,
rating, link language and type), which no missing book can match.

**Filters.** New keys `have`, `reading`, `format`, `age`, `rating`; `status` gains
"standalone". `libraryFilterGroups` lists the decision-37 groups with data: fixed lists for
Have, Status, Format, Series status, Rating (5, 4, 3 and lower, none), Age when a book has one;
present values for Genre, Tropes (with search), Author, Link language and type. Status and
Rating match owned books only: a wanted one shows neither. Long groups fold after four. No
counts on options.

**Address.** Search and applied filters live in the query string (`q`, one repeated parameter
per group), read on mount (`useSearchParams`), written by `history.replaceState`: a reload or a
way back restores them, typing adds no history. Unknown parameters and empty, over-long or
out-of-list values are dropped; free values (genre, trope, author) stay, a stale one as a
removable pill.

**Drawer** (`drawer.tsx`): a portal mounted in the browser only, a scrim, a right panel from
768px, a bottom sheet below; `className` sets the width (420px here). Esc, scrim, × close it;
focus moves in, stays, returns; the page stays still. `FilterPanel` holds a draft: "Show N
books" (live, announced) applies it, Reset empties it, closing drops it. No `<dialog>`: jsdom
lacks `showModal`.

**v2 controls** (tabs, stats line, view toggle, series notes) leave `/library`. The v2 shelves
move to `components/wishlist.tsx`; `buildLibraryView`'s `"library"` branch now serves only
tests; the Wishlist step deletes it.

## Trade-offs accepted

- Between 768 and 1023px four columns are wider than drawn.
- A half number (#2.5) never fills a gap.
- No animation; no expected year on phone tiles.

## Cost

New: `lib/shelves.ts`, `lib/library-params.ts`, `drawer.tsx`, `filter-panel.tsx`,
`series-segments.tsx`, `library-tiles.tsx`, `wishlist.tsx` (moved), tests. No dependency. About
1,100 lines.

## Open questions

- Should a free filter value missing from the library be dropped from the address?
