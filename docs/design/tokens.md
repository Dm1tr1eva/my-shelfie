# Design tokens

Light theme only for now. Use exactly these colours.

## Colours

| Token | Hex | Used for |
|---|---|---|
| `page` | `#ECE4E5` | page background, inset rows, link rows |
| `card` | `#F6F1F1` | cards, inputs, filter bar, sheets |
| `ink` | `#2E1819` | main text; also the "Complete" chip and the RU badge |
| `muted` | `#6B5557` | secondary text, placeholders (passes 4.5:1 on `card` and `page`) |
| `navy` | `#192B51` | nav bar, tab bar, links, "Ongoing" chip, UK badge, active filter pills, progress panel |
| `burgundy` | `#72251F` | primary buttons, "In my library", stars, gap markers, errors, EN badge |
| `beige` | `#E0D1CA` | "Add a book" button on navy, "Unknown" chip, OTHER badge, series note box |
| `mist` | `#C6D0DD` | soft borders and dividers, "Wishlist" chip, empty progress segments |
| `slate` | `#8090A8` | genre chips (with `ink` text, 5.2:1), outline buttons, shelf bar, no-cover dashed border |
| `field` | `#6F7C93` | input borders |
| `ink-soft` | `#5A4546` | text on `beige` chips |

Text on fills:

| Fill | Text |
|---|---|
| `burgundy` | `card` (#F6F1F1) |
| `navy` | `page` (#ECE4E5); secondary text on navy is `mist` |
| `beige` | `ink` or `ink-soft` |
| `mist` | `navy` |
| `slate` | `ink` |

## Chip and badge map

| Meaning | Style |
|---|---|
| Ownership: In my library | `bg-burgundy text-card` |
| Ownership: Wishlist | `bg-mist text-navy` |
| Series: Ongoing | `bg-navy text-page` |
| Series: Complete | `bg-ink text-page` |
| Series: Unknown | `bg-beige text-ink-soft` |
| Gap in a series | `bg-burgundy text-card`, text "Gap: you own #1 and #3" |
| Genre | `bg-slate text-ink`, pill |
| Trope | `border border-slate text-ink bg-card`, pill |
| Shop link RU / UK / EN / Other | small square badge, 4–5px radius: RU `bg-ink`, UK `bg-navy`, EN `bg-burgundy`, Other `bg-beige text-ink-soft` |

Status and ownership never rely on colour alone: chips always carry a word, selected options carry a check mark.

## Type

- Headings, book and series titles: **Playfair Display** 600 (italic 500 for accents in hero headlines).
- Everything else: **Inter** 400 / 500 / 600 / 700.
- Load both with the `cyrillic` and `latin` subsets.

| Role | 1440 | 768 | 375 |
|---|---|---|---|
| Page title (h1) | 44px | 38px | 32px |
| Book title on Book page | 52px | 42px | 28px |
| Section / series title (h2) | 24–26px | 24px | 21px |
| Card title | 22px | 21px | 19–20px |
| Body | 15px, line-height 1.5 | 15px | 15–16px (inputs 16px to stop iOS zoom) |
| Small / meta | 12–13px | 12–13px | 11–13px |

## Shape and space

| Token | Value |
|---|---|
| Card radius | 12px |
| Button / input radius | 8px (10px on mobile primary buttons) |
| Chip radius | full |
| Cover radius | `3px 6px 6px 3px` (spine side tighter) |
| Content column | `max-w-5xl` (1024px) at ≥ 1024; `px-8` at 768; `px-4` at 375 |
| Button height | 44px desktop, 48–52px mobile primary |
| Input height | 44–46px desktop, 48px mobile |

## Effects

```css
/* Cover */
box-shadow:
  0 1px 2px rgb(46 24 25 / .20),
  0 12px 18px -12px rgb(46 24 25 / .55),
  inset 5px 0 0 rgb(236 228 229 / .14); /* spine highlight */

/* Shelf bar under a row of covers: 10–12px tall, bg slate */
box-shadow: 0 10px 14px -10px rgb(46 24 25 / .5);

/* Wanted (not owned) cover on the Series page */
opacity: .55; filter: saturate(.7);

/* Gap placeholder: dashed 1.5–2px burgundy border, bg burgundy at 6% */
```

Leaning book in decorative shelves: `rotate(-10deg)` with `transform-origin: bottom left`, and a left margin of about `0.17 × book height` so its top corner touches the neighbour instead of overlapping it.
