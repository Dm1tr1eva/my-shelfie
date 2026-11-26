# Design: Home after sign-in

## Problem

Signing in lands on `/library` (`client/components/login-form.tsx:31`) and `/dashboard` only
redirects there (`app/dashboard/page.tsx`). `GET /api/stats` answers every block of the v3 Home
(decisions 38–42) but nothing draws it, and progress can only be entered on Home (decision 25).

## Out of scope

Server changes, the book panel (books link to `/books/[id]`), other years, Undo, AI.

## Scale assumptions

One reader, one Home load per visit, a few progress marks a day.

## Approach

**Route: `/dashboard`.** Login, registration and the signed-in logo go there; `/` stays the
public page for everyone, as the footer's Home link expects. `/` for signed-in readers lost:
`/` renders before the session is known, so a reader would see the public page flash and swap;
`/dashboard` already waits for the session like every app page. Nothing in the nav is active.

**Data:** one SWR key, `/api/stats`. Saving progress, a goal or "Finished" revalidates it and
the library keys, so the numbers and the library agree. `components/dashboard/` holds one
file per block; `lib/stats.ts` the types, the hook and the actions.

**Layout** follows the mockups at 1440, 768 and 375.

**Popover** (`components/popover.tsx`): a card under its trigger from 768 px, a bottom sheet with
a scrim below. Opening focuses its first control, Esc or a click outside closes it and returns
focus to the trigger. Used by "Where are you now?" and the goal editor (its 375 sheet is undrawn).

**Where are you now?** Pages or Percent (Pages only for a book with `pages` that is not an
audiobook), a number, +10 / +25 / +50 added to it and capped at the maximum, Save →
`POST /api/progress`. **Finished** (in the card and the popover) sends 100%, then `PATCH` with
`status: read` and `finishedAt` as the reader's local `YYYY-MM-DD`.

**Goal:** a ring (SVG, `role="img"`), "38% · 7 weeks left", "Change goal" → − / number / +,
quick 12 · 24 · 36 · 52, "N books left in M weeks, about K a week" (K rounded up), Cancel /
Save → `PUT /api/year-goal`. Without a goal for this year the block offers "Set a goal".

**Months:** twelve bars. A month with books is a button: hover, click or Enter opens a card
with its books (cover, title, series #N, rating); Esc closes it. Empty months are plain bars.

**Audiobooks** (decision 44): the card's buttons read "Mark progress" and "Listened"; tiles and
headings keep "Read".

**Empty states** per block, each with one way forward where there is one. Loading: a skeleton
with a status line; a failed load: `ErrorState` with Try again.

**Texts** under a new `dashboard` namespace in en / ru / uk ("ты", no gendered forms, no
"buy"); `server-errors.ts` gains "Failed to fetch stats", "Failed to save progress" and "Failed
to save the goal".

## Trade-offs accepted

- **Very much segments are approximate.** Stats send `owned` and `total`, not each number's
  state, so the bar shows owned first; the wishlist page shows the real order.
- **No Undo.** "Finished" cannot be undone without deleting a progress entry, which the API
  cannot do; the book panel can set the status back.
- **"Finished" is two requests.** If the `PATCH` fails after the entry, the book stays at 100%
  and reading, and the error says so.
- **Only this year.** The API takes `?year=`; nothing asks for it yet.

## Cost

About twelve client files, three locales, around 30 behaviour tests. No dependency.

## Open questions

- Should a signed-in visit to `/` go to `/dashboard`?
- Should "Mark page" also move a "To read" book to "Reading"?
