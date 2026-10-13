# Design: filters, loading and error states, series page polish

## Problem

- Library and Wishlist can only be searched; "what do I buy next, in Ukrainian, in
  romantasy" has no answer there. Next to buy has four single-choice dropdowns instead of the
  handoff's filter bar (`components.md`: FilterBar, FilterSheet).
- Every list shows a bare "Loading..." line and every failure a bare red sentence
  (`library.tsx`, `next-to-buy.tsx`, `series-page.tsx`, `book-page.tsx`); the handoff has a
  skeleton (`loading-1440`) and a retry card.
- The series page differs from `series-1440`: no eyebrow, no "Edit note", ownership wording.

## Out of scope

Server-side filtering for the library (everything is already loaded), saving filters between
visits, sorting, an infinite list, offline handling.

## Scale assumptions

Hundreds of books, tens of series, one user; the list is held in memory (`?limit=500`).

## Approach

1. **One filter model**, `lib/filters.ts`: five groups (genre, trope, series status, author,
   shop language), each a list of chosen values. Inside a group values are OR, across groups
   AND. `applyFilters` and `filterOptions` are pure; an option's count is faceted: the books
   that match every other group and carry that value. A selected value never vanishes from
   its list even when its count is zero.
2. **Filtering on the client** for Library, Wishlist and Next to buy. Next to buy now fetches
   once and filters in the browser, so counts come from the same list; the server keeps its
   query parameters (documented, tested, unused by the page). Missing-number items match only
   the status and author filters, as the server rule already says.
3. **Two views of the same state.** From 768 px, a bar of buttons each opening a checkbox
   popover with counts and Clear / Apply, then removable chips and "Clear all". Below 768 px, a
   "Filters · n" button opening a bottom sheet of toggle pills with a trope and author search,
   "+n more" folds, and a sticky "Clear all" / "Show n books". Both render, CSS picks one,
   as the nav and tab bar already do.
4. **Library under a filter** behaves like a search: gap tiles go away, because a tile for a
   number you filtered out would lie. Counts above the list: "14 books in 4 groups".
5. **States.** `Skeleton` (beige blocks in 2:3, a faded second shelf, `aria-busy`, visible
   "Loading your shelves…") replaces the loading line on Library, Wishlist, Next to buy and the
   series page. `ErrorState` is the burgundy retry card; list hooks expose `reload`. A missing
   book or series gets its own "not found" card with a way back.
6. **Series page:** an eyebrow "Ongoing series", an "Edit note" link into the edit form,
   tile labels "In my library", "Wishlist · gap", "Wishlist".

## Trade-offs accepted

- Two copies of the filter UI in the DOM; tests and screen readers see the visible one only
  because the other is `display: none`.
- Facet counts are recomputed on each render: O(options × books), fine at this size.
- The sheet applies on "Show n books", not live: closing it discards the draft.
- Filters reset on navigation; nothing is stored.

## Cost

New: `lib/filters.ts`, `components/filter-bar.tsx`, `skeleton.tsx`, `error-state.tsx` and
tests. Edited: Library, Next to buy, series and book pages, `catalogue.ts`, the SWR hooks.
Roughly 900 changed lines with tests; no server change.

## Open questions

None.
