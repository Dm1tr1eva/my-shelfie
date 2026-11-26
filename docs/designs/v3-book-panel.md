# Design: v3 book panel

## Problem

A book is a full page (`components/book-page.tsx`) saved from an "unsaved changes" bar, deleted
through `window.confirm`. The v3 handoff (decisions 4, 19–25, 43–44, 50; `book-panel-*`,
`book-states-1440`, `book-links-1440`, `book-delete-*`) wants a panel over the page it was
opened from, autosave with Undo, audiobooks, links with several languages, impressions and a
confirmation dialog.

## Out of scope

Series page, add modal, Home and entering progress, AI buttons, desire, server changes.
Changing a book's series, genres or tropes (not drawn in the panel).

## Scale assumptions

One panel at a time, a few saves a minute, one tab.

## Approach

**Routing.** A root `@panel` slot: `@panel/(.)books/[id]` intercepts a soft navigation and
renders the panel over the current page, closing with `router.back()`, so the page underneath
keeps its state and address (library filters included). `@panel/default` and `@panel/[...rest]`
render nothing, so leaving for another page closes it. A direct visit to `/books/[id]` renders
the library with the panel open; closing replaces the address with `/library`.

**Drawer** gains `tall` (a sheet from 32px with the grab handle) and `lightScrim` (0.28, the
new `scrim-light` token); width stays `className` (460px, 500px from 1024px). Escape already
handled (`defaultPrevented`) by an open form, list or dialog closes only that.

**Content** (decisions 19–24): "Change cover" (Google Books covers from the existing search, a
URL, the placeholder), title and author renamed in place, property rows: Have/Want, Format
(three options), Pages or Duration (hours and minutes) for audio, Status (owned books only;
audio says Listening/Listened), then by status — Reading: progress, Started, Finished; Dropped:
grey progress, Rating, dates; Read: Rating, dates. Progress: the latest `GET /api/progress`
entry, shown only (0% without one). Annotation, Links (rows; "+ link" form with Type, URL and a
searchable multi-select of the four API languages), Impressions (six preset moods stored in
English like default genres, own moods, recommend, quotes with page, my note), "Delete book" →
`ConfirmDialog`. A series book shows the series' annotation read-only: the API returns that,
not its own.

**Autosave.** `lib/use-book-autosave.ts` queues `PATCH`es, so two quick clicks cannot land out
of order. Choices (toggles, selects, stars, pills, dates, links, quotes, cover) save at once
and update the cache optimistically; numbers and renames on blur or Enter; text areas on blur
and before the panel closes — closing waits, and a failed save keeps the panel open. Each save
shows a "Saved" toast whose Undo sends the values the book had before it. A failure rolls the
cache back, keeps typed text in its field and shows an error toast that stays, with Retry.

**Shared** with the series page next: `toast.tsx` (navy, bottom centre, Undo, hides after five
seconds; an error stays, with Retry) and `confirm-dialog.tsx` (Cancel focused, Escape cancels,
focus trapped and returned). `auto-textarea.tsx`: `field-sizing: content` with a height
fallback.

**States**, inside the panel: skeleton, `NotFound` on `404`, an error with "Try again".

**Removed.** `book-page.tsx`, its tests and save bar, `OwnershipToggle`.

## Trade-offs accepted

- Text typed and not yet blurred is lost if the tab is closed or reloaded.
- Undo reverts the latest save only; there is no history.
- A direct visit always shows the library underneath.
- `/books/*` still highlights no nav item.
- Quotes are added and removed, not edited.

## Cost

New: `book-panel.tsx`, `book-links.tsx`, `book-impressions.tsx`, `book-cover-picker.tsx`,
`toast.tsx`, `confirm-dialog.tsx`, `auto-textarea.tsx`, `lib/use-book-autosave.ts`,
`lib/progress.ts`, four route files, tests, i18n keys. No dependency. About 1,500 lines.

## Open questions

- A book's own annotation (the mockup's differs from the series') needs the DTO to stop
  returning the series' annotation for series books.
- Where should a standalone book's genres and tropes be edited now?
