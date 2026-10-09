# Design: visual refresh — palette, type, dashboard

## Problem

The site still has the `create-next-app` look: white or near-black, black buttons, Geist, which
has no Cyrillic, so Ukrainian titles fall back to a system font, and every colour hard-coded as
`border`, `text-neutral-500` or `text-red-600`. The shelf is a plain text list with no overview.
The author supplied a palette (seven colours from a colour-code card) and four reading-tracker
mock-ups as inspiration, not as templates.

## Out of scope

A yearly reading goal and progress ring (needs a backend field), quotes, a calendar log,
per-book reading progress, illustrations beyond one decorative shelf, new pages, a third
"system" choice in the theme switch.

## Scale assumptions

One list within the existing 100-book cap. Nothing here adds a request.

## Approach

**Tokens.** Every colour becomes a CSS variable in `globals.css`, exposed to Tailwind as
`bg-surface`, `text-muted`, `bg-accent` and so on. Light: cream `#ECE4E5` page, `#F6F1F1` cards,
`#2E1819` text, burgundy `#72251F` for primary buttons and "Read", navy `#192B51` for links and
"Reading", `#C6D0DD` for "Want to read", beige `#E0D1CA` for "Dropped". Dark: brown `#2E1819`
page, beige buttons, the same hues for status. Each text and border pair passed WCAG AA (4.5:1
text, 3:1 input borders), checked with a script; one dark chip failed and was recoloured.

**Theme switch.** Each token is a `light-dark()` pair, so `color-scheme` picks the theme: both
values follow the system, and a `data-theme` attribute on `<html>` forces one. A button in the
header flips it and keeps the choice in `localStorage`; a small inline script in `<head>` applies
the stored choice before first paint, so a dark-mode visitor never sees a light flash.

**Type.** Playfair Display for headings and Inter for body, both with the Cyrillic subset, so
Ukrainian and Russian titles render in the same face as Latin ones. Geist goes.

**Dashboard.** The list is loaded once, then derived on the client:

- stat cards: books on the shelf, read, reading, average rating;
- a "Currently reading" strip of covers, shown only when something is being read;
- the filter chips filter that list instead of asking the API again;
- a list/grid toggle remembered in `localStorage`; the grid is a wall of covers.

**Home.** A serif headline, a decorative row of book spines in the palette (`aria-hidden`), the
same three feature cards.

**Shared.** Buttons, chips, inputs, cards and focus rings use the tokens everywhere; no
component keeps a literal colour. The one fixed colour is `paper`, the plate behind Google's
attribution logo, which is dark text and would vanish on the dark theme. Covers drop the
`edge=curl` page corner Google adds.

## Trade-offs accepted

- **One request instead of one per filter.** The 100-book cap already applies, so the stats are
  exact up to it and under-count beyond it. Revisit with pagination.
- **Counts and an average only.** "Read this year" is out: no form edits `finishedAt` yet.
- **View mode in `localStorage`**, wrapped in `try`/`catch`. It is per browser by nature.
- **Two typefaces add weight to every page.** Both load through `next/font` and are self-hosted.
- **`light-dark()` needs a browser from 2024 or later.** Older ones drop the colours; that is
  acceptable for a portfolio project and avoids keeping the dark values twice.

## Cost

Edited: `globals.css`, the layout, header, footer, home page, auth forms, add and edit forms,
book row, book search, privacy page, dashboard. New: `lib/book-stats.ts`,
`components/stats-cards.tsx`, `currently-reading.tsx`, `book-grid.tsx`, `view-toggle.tsx`, a test
for each. No dependencies. A large diff, mostly class names.

## Open questions

- Whether the home page deserves a real illustration instead of CSS spines — decide after
  seeing it.
