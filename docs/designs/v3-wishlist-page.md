# Design: the v3 wishlist page

## Problem

`/wishlist` draws the v2 shelves (`components/wishlist.tsx`) and `/next` the v2 Next to buy
(`components/next-to-buy.tsx`). The handoff (decisions 32–34, 45–48, `wishlist-*` mockups)
wants three groups of rows from `GET /api/wishlist` ([v3-wishlist-api.md](v3-wishlist-api.md)).

## Out of scope

The book panel (another branch), the series page, the add modal, Home, the AI.

## Scale assumptions

Tens of rows.

## Approach

**Data.** `useWishlist()` reads `/api/wishlist` through SWR without revalidating on focus. The
key replaces `next-to-buy` in `isLibraryKey`, so changes elsewhere refresh it.

**Page.** Search and the filter button, then three sections with a count
badge. Loading: `RowsSkeleton`; failure: `ErrorState` with
Retry. An empty wishlist is one `EmptyState` with "Add a book"; otherwise an empty group keeps
its heading, a `0` and one muted line saying what lands there. Under search or filters an empty
group hides, and nothing at all shows the library's "Nothing found".

**Row** (`wishlist-row.tsx`). A 64px `BookCover` (a series' placeholder shows its title),
title, author, `SeriesSegments` for a series, the desire pill and a round arrow. The arrow is
the row's only link (the series page, or `/books/[id]`), named after the title and author and
stretched over the row; the pill sits above it (the mockup's pill inside a link is invalid
HTML). From 768px the pill sits between text and arrow; below, under the segments.

**Desire pill: cycling, not a menu.** The mockup says "Tap to change"; a menu needs a popover on a
375px row. Very much → Want → Someday → Very much; its name says the level and
"tap to change", and a live region announces each
change. The level shows at once and beats the cache while
pending. The `PATCH` goes out once taps stop for 400 ms, so a double
tap is one request; leaving the page sends it at once with `keepalive`. Only the newest
answer counts. A failure restores the saved level and shows an alert naming the
row. The pill calls `apiFetch` itself, not `updateBook`/`updateSeries`: those refetch every
library key, and the wishlist would re-sort under the pointer between two taps. It updates the
wishlist cache in place and refreshes the rest, so **rows keep their order until the next
load**.

**Search and filters** reuse the library's `FilterPanel`, `Drawer`, pills and address format
(`q` plus one repeated parameter per group, `replaceState`). Groups: Genre, Tropes, Author,
Series status (plus "Standalone books"), Link language, Link type. `filters.ts` gains a matcher
over a function of values, shared by library subjects and wishlist rows, and a panel-group
builder over a key list; `readLibraryParams` takes the key list, so `?format=paper` on
`/wishlist` is dropped, not counted. Search matches title or author. `FilterPanel` takes its "Show N" text: rows are not all
books.

**Next to buy goes.** `/next` redirects permanently to `/wishlist`: the page is gone for good.
Deleted with it: the v2 page and shelves, `lib/next-to-buy.ts`, `series.next.*`,
`shell.titles.next`, and what only they used (`filter-bar`, `view-toggle`, `book-row`,
`book-tile`, `series-header`, `use-view-mode`, `buildLibraryView`, `shelfStats`, `isInTab`,
`buildFilterGroups`, `chipLabel`); their tests go too. Server:
`GET /api/next-to-buy`, `services/nextToBuy.js`, its schema, tests and `libraryService`
function; `findForNextToBuy` becomes `findForWishlist`.

## Trade-offs accepted

- **Order goes stale after a change** until the next load.
- **No format, reading status, rating or age filters**: the endpoint sends none.
- **A change is lost** if the tab dies before `keepalive` fires.

## Cost

New: `lib/wishlist.ts`, `wishlist-row.tsx`, `desire-pill.tsx`, a rewritten `wishlist.tsx`, a
message file per language, tests. Deleted: about 1,500 lines of v2 code and the Next to buy
server path. No dependency.

## Open questions

- Should a desire change offer Undo (decision 50's toast)? No toast component exists yet.
