# Design: v3 tokens, shared labels and the shell

## Problem

`components/app-nav.tsx:9-13` lists three sections,
Next to buy among them; `components/tab-bar.tsx` is a full-width five-column bar with labels
holding the account; no mobile header; the logo is the text "my-shelfie".
Reading status is a filled chip (`components/status-chip.tsx`), series status and language
codes are filled in one colour per value (`components/chips.tsx:13-25`), buttons are 8px
rectangles (`app/globals.css`, `.btn-*`). The v3 handoff (`tokens.md`, `components.md`,
`tags-1440`, `logo-1440`, decisions 2, 3, 5, 6, 45–48) replaces this.

## Out of scope

Library shelves, book panel, series layout, add modal, wishlist, home, filter panel;
labels nothing renders yet (age, desire, AI, segments); "Listening" for audiobooks, which
needs the `audio` format from the data-model step; underlined links (decision 48), which go
with each screen's own step; the server.

## Scale assumptions

No route, no dependency.

## Approach

**Tokens.** The `@theme` additions from `tokens.md` as written, plus a `num` utility (Inter
700, lining tabular figures) used by every `#N`.

**Buttons.** The existing classes are restyled in place: `.btn-primary` and `.btn-outline`
become pills (outline: slate border, navy text, card fill, 44px, 40px from `md`), and
`.btn-round` (44px circle, mist border) replaces the `btn-outline w-11 px-0` icon buttons.
`.btn-beige` keeps 8px, as drawn in the nav. A `Button` component lost: about thirty call
sites already use the classes.

**Labels** stay in `chips.tsx`: `StatusDot` replaces `status-chip.tsx`, `WishlistLabel`
replaces `OwnershipChip` (only ever rendered for wanted books), `SeriesStatusChip` and
`LangBadge` become outlines. The number pill stays inside `BookCover`. Under a series cover an
owned book shows its status, a wanted one the wishlist label. "To read" becomes «В планах» /
«У планах» (`copy.md`).

**Logo.** `components/logo.tsx` (mark A1 + "My Shelfie") in the app nav, the mobile header
and the public header. The page title, manifest and footer use the new name. Icons are
rendered from `app/icon.svg` with `sharp` (installed by Next, used for the v2 icons) by a
scratchpad script; the ICO packs 16/32/48 PNGs by hand.
`apple-icon.png` and the maskable icon are full-bleed navy (iOS and Android cut their own
shape), the mark inside the 80% safe circle.

**Shell.** `lib/nav.ts` answers two questions from the path: which section is active
(Library on `/library` and `/series/*`, Wishlist on `/wishlist`, nothing elsewhere) and
whether a page is inner (`/series/*`, `/books/*`, `/add*`). `AppNav` (768+): logo · Library ·
Wishlist · "+ Add a book" (to `/add`) · account. `TabBar` (< 768): floating navy pill, shelf ·
burgundy `+` · bookmark, icons only with `aria-label`s, lifted by the safe-area inset.
`MobileHeader` (< 768): navy 56px, logo and account on top-level pages, "← Library" on inner
ones ("Back to the library" to screen readers). Focus rings on navy are light. The account
menu keeps the language switch and install.

## Trade-offs accepted

- "← Library" always leads to `/library`, and inner pages have no account button on
  phones, as drawn.
- `/books/*` highlights nothing: the path cannot tell.
- Next to buy has no nav item; `/next` works by URL until the Wishlist step.
- Below 420px the public header shows only the mark; the name does not fit.
- Inactive tab icons are slate on navy (about 4:1).

## v2 superseded

In `docs/design/`: `components.md` Layout (AppNav, TabBar, PublicHeader) and Chips;
`tokens.md` "Chip and badge map" and the button shapes.

## Cost

New: `logo.tsx`, `mobile-header.tsx`, `lib/nav.ts`, tests. Removed: `status-chip.tsx`.
Changed: `globals.css`, the shell, labels and call sites, messages, six icon files,
manifest, layout. About 400 lines.

## Open questions

- Should Next to buy get an interim entry point (account menu) before the Wishlist step?
- UK «У планах» is not in `copy.md`; confirm.
