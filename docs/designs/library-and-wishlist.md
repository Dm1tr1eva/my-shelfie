# Design: library, wishlist and series

## Problem

my-shelfie tracks reading, but the author's real use is a catalogue: the paper books she owns
plus a wishlist, kept today in a Notion table by series — series, author, genres and tropes, her
own annotation, the books in official order, shop links for the Russian and Ukrainian editions,
notes, and whether the series is finished. Adding a book there means researching it and copying
by hand. `Book` (`server/models/book.js`) has no ownership, series, tags or links, so the app
cannot replace that table, and a new user finds little to do.

## Out of scope

Until after the course submission on 2026-10-17: an AI assistant (Gemini) filling series order,
status and tropes; importing the Notion table; reading shops' sites for prices, availability or
descriptions, which their terms generally forbid; "search in shop" buttons; Google's annotation
shown live; book formats (paper or e-book); a demo account, decided at submission.

## Scale assumptions

One user: hundreds of books, tens of series, a few links per book. The 100-book list cap stays.

## Approach

**Data.** A new `Series` collection: `userId`, `title`, `author`, `status`
(`ongoing | complete | unknown`), `note`. `Book` gains `ownership` (`owned | wanted`, independent
of reading status), `seriesId` and `seriesNumber` (absent means a standalone book), `genres` from
a fixed list, `tropes` as free text with suggestions from the user's own, `links` as
`{ language: ru | uk | en | other, url }`, `notes` and `annotation` (her own text). Adding the next book of a
series copies the previous book's genres and tropes.

**Next to buy.** For each series she has started (owns one book of), all its wanted books, gaps
first, then the rest by series and number, then standalone wishlist books. Filters: link
language, genre, trope, series status. "I bought it" makes the book owned. The README presents
this as the algorithm. The screens follow the handoff in `docs/design/`.

**Screens.** A library with two tabs, "My library" (owned) and "Wishlist" (wanted), grouped by
series; a series page; a book page; an add flow (Google search, pick a result, "Add to library"
or "Add to wishlist", then optional series, genres, tropes and links); "Next to buy". Reading
status and stats stay, as secondary.

**Labels.** The reading status `want` is shown as "To read", so it is never confused with the
wishlist; the stored value does not change.

## Trade-offs accepted

- **A book with no `ownership` counts as owned**: queries treat anything but "wanted" as owned,
  so existing books need no migration.
- **Series books are added one at a time**, through "Add the next book" on the series page with
  the search prefilled. The AI assistant removes this step later.
- **Genres and tropes are per book**, so a series shows the union of its books' tags. Copying
  them to the next book keeps a series consistent; editing one book changes only that book.
- **Links are checked only for being URLs.** A dead shop link is the user's to fix.

## Cost

Server: the `Series` model and its layers; the Book schema, Zod schemas and DTO; `GET
/api/next-to-buy` and `/api/tropes`; tests. Client: library tabs and grouping, series and book
pages, the add flow, tag and link editors, the next-to-buy screen, tests. Docs: `books.md`, a new
`series.md`, the roadmap, the README. No dependencies. About five working days.

## Open questions

- The genre list (a proposal is in the roadmap).
