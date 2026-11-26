# Design: v3 library

## Problem

`/library` shows owned books only (`components/library.tsx`, `isInTab`), with tabs, a stats
line, a grid/list toggle, series notes, gaps only below the highest owned number
(`lib/catalogue.ts:gapNumbersOf`) and filter popovers (`filter-bar.tsx`). The v3 handoff
(decisions 7–13, 35–37) wants one library of all books.

## Out of scope

Book panel, series page, add modal, wishlist, home, server, "Listening" for audiobooks.
`/wishlist` and `/next` keep their v2 screens until the Wishlist step.

## Scale assumptions

Hundreds of books, tens of series, derived in the browser.

## Approach

**Shelves** (`lib/shelves.ts`). A series shelf lists its books by number, unnumbered last. Its
numbers run to the largest of `totalBooks`, the highest whole book number and the highest
`expected` number; each run of whole numbers with no book is one gap slot `#4–6`. Segments: one
per book (owned or wanted) and per missing number, in slot order. Series come newest-first,
then "Standalone books" by title. Empty series get no shelf.

**Rows.** Seven columns from 64rem, four below (`matchMedia` on `lg:`'s query). A series that
fits shows whole, seven slots included; a longer one shows `columns − 1` and `+N more` (hidden
books and missing numbers). This follows `library-1440` (six and a tile), not `screens.md` ("6
per series row (or 5 + a tile)"). Standalone books wrap, a shelf bar per row.

**Tiles** (`library-tiles.tsx`): fixed height, cover, a two-line title, one meta line (status
and rating, or "In wishlist" with a dimmed cover). Below 768px the text is screen-reader only
and the gap shows a `+` circle. A cover links to `/books/[id]`, a gap to
`/add?series=…&number=<first>`, `+N more` and the series header (an `h2`, author, status,
segments) to `/series/[id]`.

**SeriesSegments**: at most ten 16/12×6px bars and a muted `+N`, `role="img"` "Own 2 of 6".

**Search and filters** narrow books by title, author or series title. Gap tiles stay
(`filters-1440`); a series with no matching book disappears. Loading, error and empty states
reuse the v2 ones.

**Filters.** `lib/filters.ts` gains keys `have`, `reading`, `format`, `age`, `rating`, and
`status` a "standalone" value. `libraryFilterGroups` lists the decision-37 groups that have
data: fixed lists for Have, Status (owned books only: a wanted one shows none), Format, Series
status, Rating (5, 4, 3 and lower, none), Age when a book has one; present values for Genre,
Tropes (with search), Author, Link language and Link type. Genre, Tropes and Author fold after
four. No counts on options. The button counts active filters; they show as navy × pills.

**Drawer** (`drawer.tsx`): a portal, mounted only in the browser, with a scrim, a right panel
from 768px, a bottom sheet below; `label`, `header`, `footer`, `children`, `onClose`, and
`className` for the width (420px; the book panel's 460/500). Esc, scrim and × close it; focus
moves in, stays inside and returns to the opener; the page does not scroll behind.
`FilterPanel` holds a draft: "Show N books" (count live, announced) applies it, Reset empties
it, closing drops it. `<dialog>` lost: jsdom lacks `showModal`.

**v2 controls.** Tabs, stats line, view toggle and series notes leave `/library` per the
handoff. The v2 component moves to `components/wishlist.tsx` without tabs. The `"library"`
branch of `buildLibraryView` is now reached only by tests; the Wishlist step deletes it.

## Trade-offs accepted

- Between 768 and 1023px four columns are wider than drawn.
- A half number (#2.5) never fills a gap.
- Opening a book or reloading clears filters.
- No animation.

## Cost

New: `lib/shelves.ts`, `drawer.tsx`, `filter-panel.tsx`, `series-segments.tsx`,
`library-tiles.tsx`, `wishlist.tsx` (moved), tests. No dependency. About 900 lines.

## Open questions

- Should filters persist in the URL?
- Should a gap tile show the expected year?
