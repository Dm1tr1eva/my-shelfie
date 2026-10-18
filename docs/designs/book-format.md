# Design: paper or e-book mark on every book, and a favicon

## Problem

The catalogue assumes every book is a paper one (`docs/ROADMAP.md`, "Current focus"). The
author also reads e-books and wants to tell the two apart at a glance on every shelf. A `Book`
has no such field (`server/models/book.js`), and `BookCover` draws only a series number
(`client/components/book-cover.tsx`). The tab icon is still the `create-next-app` default
(`client/app/favicon.ico`), with five unused starter SVGs left in `client/public/`.

## Out of scope

- A book that exists in both formats at once (see trade-offs).
- Filtering or counting by format, in the stats or in Next to buy.
- Audiobooks, and a dark-theme favicon.

## Scale assumptions

A few hundred books per user; the field is one short string on an existing document.

## Approach

**Data.** `Book.format`: `"paper" | "ebook"`, default `"paper"`. Existing documents have no
value; Mongoose applies the schema default when it loads them, so they read as paper and
there is no migration. The create and update schemas accept it, strictly, like every other field. It is
per book, not per series: a series can mix formats.

**Display.** `BookCover` takes an optional `format` and draws a round badge in its top-right
corner (the series number already sits top-left): an open-book icon for paper, an e-reader
icon for an e-book. The icon is decoration; the badge carries a visually hidden text ("Paper
book", "E-book") and a `title`, so format is never conveyed by shape alone. The badge shows
wherever a cover shows a saved book: library tiles and rows, series page, Next to buy, book
page, details step. Not on search results, which are not books yet.

**Editing.** A two-option radio group "Format" (Paper / E-book) on the book page, next to
ownership, and on the details step of adding a book. The book page saves it through the
existing unsaved-changes bar and sends only the changed field. The first add step stays as it
is; the default is paper, so the common case costs nothing.

**Favicon.** `client/app/icon.svg` (navy rounded square with three spines on a shelf, in the
palette tokens), plus `favicon.ico` and `apple-icon.png` rendered from the same SVG with
`sharp`, which ships with Next. Next adds the `<link>` tags from the file names; no
metadata code. The starter SVGs in `public/` go.

**Alternative that lost:** an array `formats` allowing both. It needs a multi-select, two
badges per cover and a decision about what a wishlist book "in both" means. Nothing in
the author's use needs it today.

## Trade-offs accepted

- One format per book. Owning the paper copy and the e-book of the same title means two
  entries or picking one. Moving to an array later is a migration of one field to a list; the
  DTO can hide the change.
- A book on the wishlist also carries a format ("I want the e-book"), which is what the
  author asked for; no separate wishlist semantics.
- The favicon is a generated raster for `.ico` and the apple icon; if the design changes the
  files must be regenerated. The script is not kept in the repository, the SVG is the source.

## Cost

Server: one constant, one model line, one schema line, one DTO line, three tests. Client: one
icon, one prop on `BookCover`, one form control, wiring in six components, tests. Docs:
`features/books.md`, this file, ROADMAP. Roughly 250 changed lines and four binary files; no
new dependency (`sharp` is used once, outside the repository).

## Open questions

- Should "both formats" be real? If the author starts entering the same title twice, switch to
  the array.
