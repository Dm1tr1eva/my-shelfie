# Design: v3 library

## Problem

`/library` shows owned books only (`components/library.tsx`, `isInTab`), with My library /
Wishlist tabs, a stats line, a grid/list toggle, series notes, gaps only below the highest
owned number (`lib/catalogue.ts:gapNumbersOf`) and filter popovers (`filter-bar.tsx`). The v3
handoff (decisions 1, 5, 7–13, 35–37; `library-*`, `filters-*`) wants one library of all books.

## Out of scope

Book panel, series page, add modal, wishlist, home, the server. `/wishlist` and `/next` keep
their v2 screens until the Wishlist step.

## Scale assumptions

Hundreds of books, tens of series, loaded once and derived in the browser.

## Approach

**Shelves** (`lib/shelves.ts`, pure). A series shelf lists its books by number, unnumbered
last. Its numbers run to the largest of `totalBooks`, the highest whole book number and the
highest `expected` number; each run of consecutive whole numbers with no book becomes one gap
slot `#4–6`. Segments follow the same sequence: owned, wanted or missing. Series come
newest-first, then "Standalone books" by title.

**Rows.** Seven columns from 1024px, four below (`useShelfColumns`, `matchMedia`). A series
with more slots than columns shows `columns − 1` and a `+N more` tile, N counting the hidden
books and missing numbers; standalone books are cut into rows, each on its own shelf bar. A JS
count keeps one DOM and a testable rule; the page renders after auth, so nothing mismatches.

**Tiles.** Fixed height: cover, a two-line title, one meta line (status and rating, or "In
wishlist" with a dimmed cover). Below 768px the text is screen-reader only. A cover links to
`/books/[id]`, a gap to `/add?series=…&number=<first>`, `+N more` and the whole series header
to `/series/[id]`.

**SeriesSegments** (`components/series-segments.tsx`): takes the states, draws at most ten
16/12×6px bars and a muted `+N`, `role="img"` labelled "Own 2 of 6".

**Search** matches title, author or series title. While a search or a filter is on, gap tiles
are hidden and shelves show matching books only, as in v2; segments always show the series.

**Filters.** `lib/filters.ts` gains keys `have`, `reading`, `format`, `age`, `rating`, and
`status` a "standalone" value. `libraryFilterGroups` lists the decision-37 groups that have
data: fixed lists for Have, Status, Format, Series status, Rating (5, 4, 3 and lower, none),
Age only when a book has one; present values for Genre, Tropes (with search), Author, Link
language and Link type. Genre, Tropes and Author fold after four. No counts on options. The v2
`FilterBar` stays for `/wishlist` and `/next`.

**Drawer** (`components/drawer.tsx`): a portal with a scrim, a right panel from 768px, a
bottom sheet below; `label`, `header`, `footer`, `children`, `onClose`, and `className` for
the width (420px here, 460/500 for the book panel). Esc, scrim and × close it; focus moves in,
Tab stays inside, focus returns to the opener; the page does not scroll behind. `FilterPanel`
fills it with a draft applied by "Show N books"; Reset clears the draft.

**v2 controls.** Tabs, stats line, grid/list toggle and series notes leave `/library`, as in
the handoff; the shell nav has Library · Wishlist. The v2 component moves to
`components/wishlist.tsx` for `/wishlist`, without the tabs, otherwise unchanged.

## Trade-offs accepted

- Between 768 and 1023px four columns are wider than drawn.
- A half number (#2.5) never fills a gap; gaps run over whole numbers.
- `+N more` counts books and missing numbers alike.
- Filters live in component state; a reload clears them.
- No open/close animation.

## Cost

New: `lib/shelves.ts`, `drawer.tsx`, `filter-panel.tsx`, `series-segments.tsx`,
`library-tiles.tsx`, `use-shelf-columns.ts`, `wishlist.tsx` (moved), tests. Changed:
`library.tsx`, `lib/filters.ts`, messages, docs. No dependency. About 900 lines.

## Open questions

- Should filters persist in the URL?
- Should a gap tile show the expected year (`Series.expected`)?
