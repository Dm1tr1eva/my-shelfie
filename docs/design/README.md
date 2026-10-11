# my-shelfie: design handoff

A personal catalogue of the paper books I own, plus a wishlist organised by series.
Stack: Next.js (App Router) + Tailwind. UI text is English; book titles are often Cyrillic.

## How to use this folder

1. Read `tokens.md` first, then put the theme from `tailwind-theme.css` (Tailwind v4) or `tailwind.config.snippet.js` (v3) into the project.
2. Build the shared components from `components.md`.
3. Build the screens in the order of the table below. Every screen has HTML mockups in `mockups/`. Open them in a browser and copy the markup and sizes; class names in the mockups are throwaway, so translate the inline styles to Tailwind utilities.
4. `decisions.md` lists the product rules the design assumes (gaps in a series, Next to buy logic, the add flow). Follow it when the mockup alone is ambiguous.

Rules that apply everywhere:

- Design nothing beyond the data in `decisions.md` → "Data model". No descriptions, page counts, dates, progress bars or recommendations.
- Text contrast WCAG AA (4.5:1). Every interactive element at least 40px tall on desktop and 44px on mobile.
- Covers in the mockups are CSS stand-ins. In code they are `<img>` with `aspect-[2/3] object-cover`, falling back to the "No cover" placeholder.
- All books, authors and series in the mockups are made up.

## Breakpoints

| Width | Mockups | What changes |
|---|---|---|
| 375 (base) | `*-375.html` | One column. Bottom tab bar with a central Add button. Filters collapse into a bottom sheet. Cover grid: 3 columns. |
| 768 (`md`) | `*-768.html` | Top navy nav bar replaces the tab bar. Filter bar shows inline. Cover grid: 4 columns. |
| 1440 | `*-1440.html` | Content column `max-w-5xl` (1024px), centred. Cover grid: 6 columns. Two-column layouts on Book, Series and Home. |

## Screens and routes

Routes are suggestions; rename freely.

| Screen | Route | Mockups | States drawn |
|---|---|---|---|
| Library, My library tab | `/library` | `library-1440`, `library-768`, `library-375`, `library-list-1440` (list view) | grid and list view, series with a gap, standalone group, book without cover, long Cyrillic title |
| Library, Wishlist tab | `/library?tab=wishlist` | `library-wishlist-375` | wanted books grouped by series, shop-link language badges |
| Series | `/series/[id]` | `series-1440`, `series-768`, `series-375` | a series with a gap (own #1 and #3, missing #2 and #4) |
| Book | `/books/[id]` | `book-1440`, `book-768`, `book-375` | 375: no cover + long Cyrillic title + no rating |
| Add a book, step 1 | `/add` | `add-1440`, `add-768`, `add-375` | results list, "already on your wishlist", success toast (1440), bottom sheet to pick library or wishlist (375) |
| Add a book, step 2 | `/add/[bookId]/details` (or a second step in the same page) | `add-details-1440`, `add-details-375` | series picker open, tag input with suggestions, link editor |
| Next to buy | `/next` | `next-1440`, `next-768`, `next-375` | gap row first, row with no links yet, standalone wishlist |
| Home (public) | `/` | `home-1440`, `home-768`, `home-375` | signed out |
| Sign in | `/login` | `login-1440`, `login-768`, `login-375` | Google + email/password |
| Create account | `/register` | `register-1440`, `register-768`, `register-375` | 375 shows field errors |
| Privacy | `/privacy` | `privacy-1440`, `privacy-768`, `privacy-375` | placeholders in `[BRACKETS]` must be filled in |

States and components:

| Mockup | What it shows |
|---|---|
| `empty-library-768` | empty library |
| `empty-wishlist-375` | empty wishlist |
| `nothing-to-buy-1440` | Next to buy with nothing missing |
| `loading-1440` | skeleton for Library (reuse the pattern on other lists) |
| `search-unavailable-375` | Google Books search failed |
| `components-1440` | chips, tag input, genre multi-select, shop-link editor, series picker, filter popover, tab bar |
| `filters-375` | mobile filter bottom sheet |

## Suggested build order

1. Tokens, fonts (Playfair Display + Inter via `next/font/google` with `cyrillic` subset), layout shell (nav bar ≥ md, tab bar < md).
2. `BookCover`, `Shelf`, `BookTile`, `SeriesHeader`, chips. Then Library (grid, then list).
3. Book page.
4. Add a book (search → pick → library or wishlist), then step 2 with `SeriesPicker`, `GenreMultiSelect`, `TagInput`, `ShopLinkEditor`.
5. Series page, Next to buy.
6. Empty, loading and error states.
7. Public pages: Home, Sign in, Create account, Privacy.
