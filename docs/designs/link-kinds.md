# Design: tell the links of a book apart by what they lead to

## Problem

A link on a book has a language and an address (`linkSchema` in `server/models/book.js`) and is
always presented as "where to buy". The author keeps four different kinds of link: a shop that
sells the paper book, a shop that sells the e-book, a place to download the e-book for free,
and a page to read it online. Today they all look the same, so a free copy cannot be told from
a shop, and "Next to buy" cannot say which links lead to a purchase.

## Out of scope

- Checking that a link works, or reading prices from the page (shops forbid it).
- A server-side filter for the kind in Next to buy; the page filters in the browser, like the
  other groups.
- Links on books that are already in the library (links stay a wishlist feature).

## Scale assumptions

A few links per wishlist book, at most ten (the existing limit).

## Approach

**Data.** A link gains `kind`: `paper`, `ebook`, `free` or `online`, with `paper` as the model
default. Links saved before this are shop links to paper books, so reading them as `paper` is
correct and needs no migration; Mongoose fills the default when it loads the document. The link
schema stays strict and accepts `kind` as optional.

**Naming.** In the interface the kinds read "Buy paper", "Buy e-book", "Free e-book download"
and "Read online", with the short chip labels Paper, E-book, Free and Online. The block on the
book page is renamed from "Where to buy" to "Where to get it", because two of the four kinds
are not purchases.

**Where it shows.**
- *Book page:* links are grouped under the four kind headings (empty groups are not drawn); a
  row keeps its language badge and host. The add-link form gets a kind choice before the
  language one.
- *Link editor* (second step of adding a book): each row gets a kind select.
- *Next to buy:* each link chip carries its kind chip next to the language badge.
- *Filters:* a new "Link type" group, built from the links of the books on the list, in the
  fixed order above, with counts like the other groups.

**Alternative that lost:** deriving the kind from the address (a known free-library domain,
a known shop). It breaks the moment a new site appears, and the author knows what the link is.

## Trade-offs accepted

- The kind is chosen by hand, and defaults to Paper in the form; a wrong choice stays wrong.
- One address can only have one kind on a book; the book page removes a link by its address.
- A book that has only a free or an online link still appears in Next to buy: whether to buy
  it anyway is the reader's call, and the chip says why it might not be needed.
- The server does not filter Next to buy by kind.

## Cost

Server: a constant, a model field, a schema field, the DTO and tests. Client: kind constants, a
badge, a select in two places, grouping on the book page, a filter group, tests. About 200
changed lines, no migration, no dependency.

## Open questions

- Whether free and online links should also be offered for books you own. Decide after the
  author has used them on the wishlist.
