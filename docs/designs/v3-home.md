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

**Data:** one SWR key, `/api/stats`; every save revalidates it and the library keys.
`components/dashboard/` has a file per block, reusing `BookCover` and `SeriesSegments`;
`lib/stats.ts` holds the types, the hook and the actions.

**Popover** (`components/popover.tsx`): a non-modal card with an arrow under its trigger from
768 px, the same content in `Drawer` below. Its first control takes focus; Esc or a click
outside closes it, focus returns to the trigger (`aria-expanded`). Buttons stay disabled while a
request runs.

**Where are you now?** Pages or Percent (Pages only for a book with `pages` that is not an
audiobook), a number, +10 / +25 / +50 added to it and capped at the maximum, Save →
`POST /api/progress`; progress shows as a percent (decision 25). **Finished** (card and popover)
sends 100%, then `PATCH` with `status: read` and the local date as `finishedAt`.

**Goal:** a ring (SVG, `role="img"`), "38% · 7 weeks left", "Change goal" → − / number / +
(held to 1–1,000 on Save), quick 12 · 24 · 36 · 52, "N books left in M weeks, about K a week"
(K rounded up; "Goal reached" at zero), `PUT /api/year-goal`; without a goal, "Set a goal".

**Months:** twelve bars. A month with books is a button ("September, 2 books"): hover opens
its card, a click or Enter pins it, Esc closes it. Empty months are plain bars.

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
- **Only this year, in UTC**, as `home-stats.md` records.

## Cost

About eight client files, three locales, around 30 behaviour tests. No dependency.

## Open questions

- Should "Mark page" move a book that is still To read to Reading? Today the book panel does.
- Should a signed-in visit to `/` go to Home? Today `/` stays the public page.

## Review

Kept against the "cut" pass: the Pages / Percent toggle, the quick steps and an empty state per
block — the brief and `copy.md` ask for them.
