# Design: v3 library

## Problem

`/library` shows owned books only (`components/library.tsx`, `isInTab`), with tabs, a stats
line, a grid/list toggle, series notes, gaps only below the highest owned number
(`lib/catalogue.ts:gapNumbersOf`) and filter popovers (`filter-bar.tsx`). The v3 handoff
(decisions 7–13, 35–37) wants one library of all books.

## Out of scope

Book panel, series page, add modal, wishlist, home, the server, "Listening" for audiobooks.
`/wishlist` and `/next` keep their v2 screens until the Wishlist step.

## Scale assumptions

Hundreds of books, tens of series, loaded once, derived in the browser.

## Approach

**Shelves** (`lib/shelves.ts`; v2's `catalogue.ts` stays for older
screens). A series shelf lists its books by number, unnumbered last. Its numbers run to
the largest of `totalBooks`, the highest whole book number and the highest `expected` number;
each run of whole numbers with no book is one gap slot `#4–6`. Segments: one per book (owned
or wanted) and per missing number, in slot order. Series come newest-first, then "Standalone
books" by title. A series with no books has no shelf.

**Rows.** Seven columns from 1024px, four below (`matchMedia`). A series with more slots than
columns shows `columns − 1` and a `+N more` tile, N counting the hidden books and missing
numbers; standalone books are cut into rows, each on its own shelf bar.

**Tiles** (`library-tiles.tsx`; the v2 tiles stay for `/wishlist`): fixed height, cover, a
two-line title, one meta line (status and rating, or "In wishlist" with a dimmed cover). Below
768px the text is screen-reader only and the gap shows a `+` circle. A cover links to
`/books/[id]`, a gap to `/add?series=…&number=<first>`, `+N more` and the series header (an
`h2`, author, status, segments) to `/series/[id]`.

**SeriesSegments**: at most ten 16/12×6px bars and a muted `+N`, `role="img"` "Own 2 of 6".

**Search and filters** narrow books by title, author or series title. Gap tiles stay, as in
`filters-1440`; a series with no matching book disappears. Loading, error and
empty states reuse the v2 ones, once both lists load.

**Filters.** `lib/filters.ts` gains keys `have`, `reading`, `format`, `age`, `rating`, and
`status` a "standalone" value. `libraryFilterGroups` lists the decision-37 groups that have
data: fixed lists for Have, Status, Format, Series status, Rating (5, 4, 3 and lower, none),
Age only when a book has one; present values for Genre, Tropes (with search), Author, Link
language and Link type. Genre, Tropes and Author fold after four. No counts on options. The
button shows the active count; active filters are navy × pills under the title.

**Drawer** (`drawer.tsx`): a portal with a scrim, a right panel from 768px, a bottom sheet
below; `label`, `header`, `footer`, `children`, `onClose`, and `className` for the width
(420px; the book panel's 460/500). Esc, scrim and × close it; focus moves in, Tab stays
inside, focus returns to the opener; the page does not scroll behind. `FilterPanel` holds a
draft: "Show N books" (count live, announced) applies it, Reset empties it, closing drops it.
`<dialog>` lost: jsdom has no `showModal`.

**v2 controls.** Tabs, stats line, grid/list toggle and series notes leave `/library` per the
handoff. The v2 component moves to
`components/wishlist.tsx`, fixed to the wishlist, its tabs and library branches removed.

## Trade-offs accepted

- Between 768 and 1023px four columns are wider than drawn.
- A half number (#2.5) never fills a gap.
- Filters live in state: opening a book or reloading clears them.
- No animation.

## Cost

New: `lib/shelves.ts`, `drawer.tsx`, `filter-panel.tsx`, `series-segments.tsx`,
`library-tiles.tsx`, `wishlist.tsx` (moved), tests. Changed: `library.tsx`, `lib/filters.ts`,
messages, docs. No dependency. About 900 lines.

## Open questions

- Should filters persist in the URL?
- Should a gap tile show the expected year?
