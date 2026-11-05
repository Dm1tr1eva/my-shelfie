# Design: genres you add yourself

## Problem

Genres come from a fixed list of twelve. The server enforces it as an enum in three places
(`server/models/book.js`, `server/models/series.js`, the Zod schemas in `validation/`) and the
client keeps a copy (`GENRES` in `client/lib/books.ts`) that the checkbox panel in
`components/genre-multi-select.tsx` shows. A reader of cosy mysteries, litRPG or manga cannot
file a book under what it is.

## Out of scope

- Renaming or deleting a genre everywhere at once.
- Genres shared between users, or a list of "official" ones.
- Colours per genre, ordering by the user.

## Scale assumptions

A handful of custom genres per user; a few hundred books. No new collection and no new request:
the options are computed from data the pages already load.

## Approach

**Genres become free text, like tropes.** The enum goes. A genre is a trimmed string of 1 to 40
characters, at most 12 per book or series, unique ignoring case within one book or series. The
twelve names stay as defaults in the client (`DEFAULT_GENRES`), offered first.

**Where the options come from.** `useKnownGenres()` returns the defaults, then every other genre
that appears on one of the user's books or series, alphabetically, plus anything chosen but not
saved yet. So a custom genre exists as long as something uses it, and then shows up in the
panel, in the filters (already built from the data) and on both forms with no extra endpoint.

**The panel.** The checkbox panel gains a field at the bottom, "Add your own genre", with an
Add button (Enter also adds). Typing a name that already exists, in any letter case, selects the
existing one instead of making a second; typing one that is already selected says so. At twelve
genres the field and the unchecked boxes are disabled with a message. The hint under the field
becomes "Pick from the list or add your own."

**Alternative that lost:** a `Genre` collection per user with its own endpoints and a screen to
manage it. It buys rename and delete, which nobody has asked for, and costs a model, a
repository, tests and a second source of truth that can disagree with the books.

## Trade-offs accepted

- A custom genre nobody uses disappears from the list. To keep one, put it on a book.
- No rename: a typo is fixed by editing each book or series that has it.
- Names that differ only in letter case or spacing stay different on the server (the client
  picks the existing spelling when it can); the unique check is per book or series.
- The genre filter on the server matches the exact spelling; the client sends the spelling it
  has seen, so this holds.
- The twelve defaults are no longer validated by the server. Existing data is unaffected.

## Cost

New: `lib/genres.ts`, `validation/genre.js` and tests. Changed: three Mongoose and Zod places,
`genre-multi-select.tsx`, `lib/books.ts`, docs. No dependency, no migration (genres were already
stored as strings).

## Open questions

- Whether a custom genre should be pinned when unused. Decide when one actually goes missing.
