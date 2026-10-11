# Product decisions behind the design

## Data model (design nothing beyond this)

**Series**: title, author, status (`Ongoing` / `Complete` / `Unknown`), short note (e.g. "Book 4 delayed to 2027").

**Book**: cover (optional), title, author, series + number in series (or standalone), ownership (`In my library` / `Wishlist`), reading status (`To read` / `Reading` / `Read` / `Dropped`, secondary), rating 1–5 (secondary, optional), genres (fixed list), tropes (free-text tags), shop links (each with language `RU` / `UK` / `EN` / `Other` + URL), notes, optional own annotation.

Genre list: Fantasy, Romantasy, Romance, Science fiction, Mystery & thriller, Horror, Historical fiction, Contemporary fiction, Classics, Young adult, Non-fiction, Poetry.

## Series, gaps and "own n of m"

- A series' known books are the books in the database linked to it, owned or wanted. "m" in "own n of m" is the highest series number among them.
- There is no separate "announced book" entity: a book that isn't owned yet is a Book with ownership = Wishlist.
- A **gap** is a series number lower than the highest owned number that isn't owned (own #1 and #3 → #2 is a gap). Gaps are highlighted in burgundy everywhere: dashed tile on shelves, "Gap" chip in lists.
- If a gap number has no Book record at all, the Library still shows a dashed `#n` tile ("Missing from the series") with no title. Clicking it opens Add a book with the series and number pre-filled.

## Next to buy

- For every series that has at least one owned book: **all** wanted (not owned) books of that series, not only the next one.
- Order: gaps first, then the remaining numbers in series order, then standalone wishlist books.
- Each row shows cover, title, series + number, series status, and its shop links as language-marked pills. A row without links shows "No links yet · add one".
- Filters: shop-link language, genre, trope, series status.
- `I bought it` switches the book's ownership to In my library. The row then leaves the list.

## Library

- Two tabs: My library (ownership = In my library) and Wishlist (ownership = Wishlist). Counts on the tabs.
- Grouped by series, series in alphabetical order (or by last change, your call); standalone books in their own group at the end.
- Search box searches only my own books (title, author).
- Stats strip (owned · on wishlist · read) is secondary: small text, top right on desktop, one line under the filters on mobile.
- Grid view by default; list view keeps the same grouping.

## Book page

- Main block: cover on a shelf, series link with "Book 3 of 4", title, author, ownership toggle, genres and tropes.
- Then: Where to buy (links grouped by language, add/remove), Notes, My annotation.
- Secondary side card: Reading (status pills + rating). Delete in its own small card with a one-line warning ("Deletes the book, its notes and links. The series stays.").
- Edits are saved with an explicit `Save changes` bar that appears when something changed. (If you prefer autosave, drop the bar.)

## Add a book (3 actions)

1. Type in the Google Books search, press Enter.
2. Pick a result (title, author, year, cover).
3. Press `Add to library` or `Add to wishlist` (desktop: buttons on the row; mobile: tapping the row opens a bottom sheet with both buttons).

Then an optional step 2 (`Add series & tags` in the success toast, or `Skip`): series (pick or create) + number, genres (pre-filled from the series), tropes, shop links.

- A result that is already in the catalogue says so ("Already on your wishlist") and offers `Move to library` instead.
- `Add it without search` is a fallback for books not on Google Books and for when search is down. Drop it if you won't build manual entry.

## Auth

- Sign in and Create account offer `Continue with Google` / `Sign up with Google` first, then email + password.
- The "G" circle in the mockups is a placeholder; use Google's official sign-in button assets.
- Password rule "At least 8 characters" is a placeholder; replace it with your real rule.
- Create account errors are shown per field; sign-in errors as one generic banner.

## Privacy page

Everything in `[BRACKETS]` is a placeholder you must fill in or confirm: last-updated date, which Google scopes are requested, the no-tracking/no-affiliate claim, how to delete an account, the contact email.
