# Design: the v3 wishlist page

## Problem

`/wishlist` draws the v2 shelves (`components/wishlist.tsx`) and `/next` the v2 Next to buy
(`components/next-to-buy.tsx`). The handoff
(decisions 32–34, 45–48, `wishlist-*` mockups) wants three groups of rows from
`GET /api/wishlist` ([v3-wishlist-api.md](v3-wishlist-api.md)), which already exists.

## Out of scope

The book panel (another branch), the series page, the add modal, Home, the AI, shop links.

## Scale assumptions

Tens of rows; one request per visit

## Approach

**Data.** `useWishlist()` reads `/api/wishlist` through SWR. The key joins `isLibraryKey`, so
adding, editing or deleting a book or series refreshes it.

**Page.** Title, then search and the filter button side by side, then three sections with a
count badge: Continue a series, New series, Standalone books. Loading: `RowsSkeleton`; failure:
`ErrorState` with Retry. An empty wishlist is one `EmptyState` with "Add a book"; when
only some groups are empty, each keeps its heading, a `0` and one muted line saying what lands
there, as the v2 empty states did. Under search or filters an empty group hides, and nothing at
all shows the library's "Nothing found".

**Row** (`wishlist-row.tsx`). A 64px `BookCover` (a series uses its own title for the
placeholder), title, author, `SeriesSegments` for a series, the desire pill and a round arrow.
The arrow is the row's only link (the series page, or `/books/[id]`), stretched over the row:
the mockup nests the pill button inside a link, which HTML forbids. From 768px the pill sits between text and arrow;
below, under the segments.

**Desire pill: cycling, not a menu.** The mockup labels it "Tap to change"; a menu would need a
popover on a 375px row. Very much → Want → Someday →
Very much. It shows at once; the `PATCH` (series or book) goes out once the taps
stop for 400 ms (or the page is left), so a double tap is one request and responses cannot
arrive out of order. A failure puts the last saved level back and shows an alert. **Rows do not
re-sort** until the next load: a row moving under the pointer between two taps would take the
second tap. Other library keys are refreshed; the wishlist's own cache is updated in place.

**Search and filters** reuse the library's: the same `FilterPanel` in the same `Drawer`, the
same removable pills, the same address format (`q` plus one repeated parameter per group, read
on mount, written with `replaceState`). Groups: Genre, Tropes, Author, Series status (plus
"Standalone books"), Link language, Link type. `filters.ts`
gains a matcher over a function of values, so library subjects and wishlist rows share
`matchesFilters` and the panel-group builder; `library-params.ts` takes the group list. Search
matches a row's title or author.

**Next to buy goes.** `/next` permanently redirects to `/wishlist` (`permanentRedirect`); the
v2 page, `lib/next-to-buy.ts`, `series.next.*`, the v2 wishlist shelves and what only they used
(`filter-bar`, `view-toggle`, `book-row`, `book-tile`, `series-header`, `use-view-mode`,
`buildLibraryView`, `shelfStats`, `isInTab`, the old filter-group builder) are deleted. On the
server: `GET /api/next-to-buy`, `services/nextToBuy.js`, its schema and tests;
`findForNextToBuy` becomes `findForWishlist`.

**Words.** en/ru/uk; RU/UK use "ты", no gendered verbs, never "buy".

## Trade-offs accepted

- **Order goes stale after a change** until the next load or refocus, by choice.
- **Cycling past a level** takes up to two taps; a menu would take two every time.
- **Search does not look inside a series**: no book titles are sent.
- **No format, reading status, rating or age filters** on this page (the endpoint sends none).

## Cost

New: `lib/wishlist.ts`, `wishlist-row.tsx`, `desire-pill.tsx`, a rewritten `wishlist.tsx`,
tests. Deleted: about 1,500 lines of v2 client code and the Next to buy server path. No
dependency.

## Open questions

None.
