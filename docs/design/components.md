# Components

Props are suggestions. "See" points to the mockup that shows the component best.

## Layout

**`AppNav`** (≥ md). Navy bar, 64–68px. Logo (Playfair 700) · Library / Wishlist / Next to buy links (active: `bg-mist/20 text-page`) · `Add a book` button (`bg-beige text-ink`) · account avatar button. See `library-1440`. The logo links to `/`, the public home page — not to Library. Changed 2026-10-15 after the handoff: a signed-in user otherwise had no way back to the home page.

**`TabBar`** (< md). Fixed bottom, navy, 78px, 5 columns: Library · Wishlist · **Add** (56px burgundy circle raised 28px above the bar, ringed with the page colour) · Next to buy · Account. Active item: pill highlight behind the icon, bold label, `aria-current="page"`. Pages need `pb-[100px]` so content clears it. See `components-1440`, `library-375`.

**`PublicHeader`**. Navy bar with logo and an outline `Sign in` link. No app nav. See `home-1440`.

**`Footer`**. One row: "my-shelfie · a book-catalogue pet project" + Home + Source on GitHub + Privacy (links 40–44px tall). Home (added 2026-10-15) is the only way back to the home page on a phone while signed in, where there is no top bar.

## Books and shelves

**`BookCover`** `{ src?, title, author?, size }`. `aspect-[2/3] rounded-cover shadow-cover`. Without `src`: dashed `slate` border, book icon, "No cover". Optional `number` badge top-left (`#3`, pill on `card`).

**`Shelf`**. Row of covers on a 10–12px `slate` bar with `shadow-shelf`. The grid sits slightly inset from the bar (`px-3`).

**`BookTile`** `{ book, showNumber }`. Cover + title (2-line clamp, 13–15px semibold) + meta line (reading status, `★ n` in burgundy). Whole tile is one link. See `library-*`.

**`GapTile`** `{ number, title?, onWishlist }`. Dashed burgundy box in the place of a missing series number: "#2 · Missing from the series · On wishlist". Used in Library and Series. See `library-1440`, `series-1440`.

**`SeriesHeader`** `{ series, owned, total }`. Title (Playfair) + status chip, author · italic note, `OwnProgress`, link to the series page. On mobile the whole header is the link.

**`OwnProgress`** `{ ownedNumbers, total }`. Segmented bar, one segment per book number (filled burgundy if owned, `mist` if not) + "Own 2 of 4". Give it `role="img"` and an `aria-label` that names the owned numbers. On the Series page it sits in a navy panel with the big "2 of 4" and the `Add the next book` button.

**`BookRow`** (list view and Next to buy). Thumbnail 40–64px, title, author or "Series · #n", genre chip, up to two trope chips + "+n", status, rating, chevron. See `library-list-1440`, `next-1440`.

## Chips

`StatusChip`, `OwnershipChip`, `SeriesStatusChip`, `GenreChip`, `TropeChip`, `LangBadge`. Colours: `tokens.md` → "Chip and badge map". Removable chips get an inner 28px × button with `aria-label="Remove …"`.

## Forms

**`OwnershipToggle`**. Two-option segmented control (`role="radiogroup"`): In my library (selected: burgundy fill + check) / Wishlist. See `book-*`.

**`ReadingStatusPills`**. To read / Reading / Read / Dropped, pills 40–44px, selected = navy fill. Secondary: lives in the "Reading" card.

**`StarRating`**. Five 40–44px buttons, filled burgundy / outlined, plus `Clear` (or "Not rated" text when empty).

**`TagInput`** (tropes, free text). Chips inside the field, input grows to fill the rest. Typing opens a listbox: matches with the typed part in bold and "used in n books", then `Create "…"`. Enter or comma adds; Backspace on an empty input removes the last chip. ARIA: combobox + listbox. See `components-1440`, `add-details-1440`.

**`GenreMultiSelect`** (fixed list). Selected genres as chips in a button-like field; opens a two-column checkbox listbox (`aria-multiselectable`). On mobile it opens a sheet. List: Fantasy, Romantasy, Romance, Science fiction, Mystery & thriller, Horror, Historical fiction, Contemporary fiction, Classics, Young adult, Non-fiction, Poetry.

**`ShopLinkEditor`**. Rows of `[language select RU/UK/EN/Other] [URL input] [remove]`, plus `Add another link`. Inline URL validation under the row ("Start the link with https://"). On the Book page saved links are shown grouped by language (badge + name), each row a link with an external icon and a remove button; the add form sits under them.

**`SeriesPicker`**. Combobox. Options show title, author, "own n of m", status chip. Last option: `New series "…"`, which expands inline fields (title, author, status) and `Create series`. Beside it, a number input (`No.`). Under it: `Mark as standalone`. When the chosen number fills a gap, show a confirmation line ("This fills the gap: you now own books 1 to 3 of 4").

**`PasswordInput`**. Eye button 40–44px inside the right edge; toggles `type` and `aria-label` (Show / Hide password).

**Errors**. 2px burgundy border, `aria-invalid`, message under the field with an icon (never colour alone). Sign-in errors use one banner above the form instead, so it doesn't reveal which field was wrong.

## Filters

**`FilterBar`** (≥ md). Card with dropdown buttons: Genre · Trope · Series status · Author · Shop language. Each shows a count badge when active and opens a checkbox popover with per-option counts and Clear / Apply. Under the buttons: result count, removable navy chips for active filters, `Clear all`. Grid/list toggle on the right (Library only). See `library-1440`, `components-1440`.

**`FilterSheet`** (< md). The `Filters · n` button opens a bottom sheet with the same groups as toggle pills, an author select, a trope search, and a sticky footer `Clear all` / `Show n books`. Active filters also show as a horizontally scrolling chip row under the button. See `filters-375`.

## Feedback

**`Skeleton`**. `bg-beige` blocks, covers in 2:3, faded second shelf, `aria-busy` on the list and a visible "Loading your shelves…" status line. See `loading-1440`.

**`EmptyState`** `{ illustration, title, text, action }`. Centred, Playfair title, one primary action. See `empty-*`, `nothing-to-buy-1440`.

**`Toast` / inline success**. Navy bar with a check: "<Title> added to your library." + `Add series & tags` + `Done`. See `add-1440`.

**`SearchError`**. Burgundy-bordered card with `role="alert"`: "Google Books isn't answering", `Try again`, `Add it without search`. See `search-unavailable-375`.
