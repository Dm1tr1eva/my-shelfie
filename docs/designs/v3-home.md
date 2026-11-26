# Design: Home after sign-in

## Problem

Signing in lands on `/library` (`client/components/login-form.tsx:31`); `/dashboard` only
redirects there. Nothing draws `GET /api/stats`, and progress is entered only on Home
(decision 25).

## Out of scope

Server changes, the book panel (books link to `/books/[id]`), other years, Undo, AI.

## Scale assumptions

One reader, one Home load per visit, a few progress marks a day; mockups at 1440, 768, 375.

## Approach

**Route: `/dashboard`.** Login, registration and the signed-in logo (`Logo` gains an `href`)
go there; `/` stays public, as the footer's Home link expects. `/` lost: it renders before the
session is known, so the public page would flash; `/dashboard` waits for the session like every
app page. Nothing in the nav is active.

**Data:** one SWR key, `/api/stats`. Saving progress, a goal or "Finished" revalidates it and
the library keys, so the numbers and the library agree. `components/dashboard/` holds five
files (tiles, reading, goal, months, the small lists) reusing `BookCover` and
`SeriesSegments`; `lib/stats.ts` the types, the hook and the actions.

**Popover** (`components/popover.tsx`): a non-modal card under its trigger from 768 px; below,
the same content inside the existing `Drawer` sheet. Its first control takes focus; Esc or a
click outside closes it and focus returns to the trigger, which carries `aria-expanded`.
Buttons stay disabled while a request runs.

**Where are you now?** Pages or Percent (Pages only for a book with `pages` that is not an
audiobook), a number, +10 / +25 / +50 added to it and capped at the maximum, Save →
`POST /api/progress`; progress shows as a percent (decision 25). **Finished** (card and popover)
sends 100%, then `PATCH` with `status: read` and the local date as `finishedAt`.

**Goal:** a ring (SVG, `role="img"`), "38% · 7 weeks left", "Change goal" → − / number / +,
quick 12 · 24 · 36 · 52, "N books left in M weeks, about K a week" (K rounded up; "Goal
reached" at zero), 1 to 1,000, Cancel / Save → `PUT /api/year-goal`. Without a goal for this
year the block offers "Set a goal".

**Months:** twelve bars. A month with books is a button named "September, 2 books": hover,
click or Enter opens a card with its books; Esc closes it. Empty months are plain bars.

**Audiobooks** (decision 44): the card's buttons read "Mark progress" and "Listened"; tiles and
headings keep "Read".

**Empty states** per block, each with one way forward where there is one. Loading: a skeleton
with a status line; a failed load: `ErrorState` with Try again.

**Texts** in a new `dashboard` namespace, en / ru / uk ("ты", no gendered forms, no "buy");
`server-errors.ts` gains the stats, progress and goal `500` texts.

## Trade-offs accepted

- **Very much segments are approximate.** Stats send `owned` and `total`, not each number's
  state, so the bar shows owned first; the wishlist page shows the real order.
- **No Undo.** "Finished" cannot be undone without deleting a progress entry, which the API
  cannot do; the book panel can set the status back.
- **"Finished" is two requests.** If the `PATCH` fails after the entry, the book stays at 100%
  and reading; the server's error shows and pressing it again finishes it.
- **"Mark page" does not start a book** that is still To read; the book panel does.
- **Only this year, in UTC**, as `home-stats.md` records.

## Cost

About eight client files, three locales, around 30 behaviour tests. No dependency.

## Review

Kept against the "cut" pass: the Pages / Percent toggle, the quick steps and an empty state per
block — the brief and `copy.md` ask for them.
