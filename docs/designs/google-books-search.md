# Design: Google Books search in the add-book form

## Problem

Adding a book means typing its title and author by hand (`client/components/add-book-form.tsx`).
`Book` already has `coverUrl`, but nothing fills it and no page shows a cover, so the shelf is a
plain text list. The roadmap (stage 7) chose Google Books, with our own key, as the only source.

## Out of scope

A second source such as Open Library, a server-side result cache, storing descriptions, ISBN or
barcode lookup, paging through results, covers anywhere but the shelf and the search list.

## Scale assumptions

One person typing, one request per pause in typing, ten results each. One Render instance. The
Books quota is shared by everything that uses the key.

## Approach

**Backend.** `GET /api/books/search?q=` behind `requireAuth`, registered before `/:id`. A service
calls `volumes` with `q`, `maxResults=10` and `GOOGLE_BOOKS_API_KEY` and returns
`{ volumeId, title, authors, year, coverUrl, link }` per result, where `link` is
`canonicalVolumeLink` or else `infoLink`. Three findings from the live
runs shape it: `q` stays free text, because `inauthor:` and `intitle:` find nothing for Cyrillic;
thumbnails come as `http://` and are rewritten to `https://`; every field except `volumeId` and
`title` may be missing. An upstream failure answers `502` with a generic message. The key lives
only in `server/.env` and Render, never in a `NEXT_PUBLIC_` variable, because this repository is
public.

**Data.** `Book` gains an optional `googleVolumeId`. `coverUrl` stores Google's URL, not an image.
The description is not copied: Google's terms forbid keeping content longer than its cache
headers allow, and these responses carry none.

**Frontend.** The add form gets a search box that fires after 400 ms of silence and at least three
characters. Results show cover, title, author, year and a link to the Google Books page; picking
one fills title, author and cover. The fields stay editable and typing by hand still works. The
shelf shows the cover when there is one. Covers use a plain `<img>` with an
`eslint-disable-next-line` and a reason: `next/image` would route them through Vercel's
optimizer, which keeps a copy.

**Obligations.** A "powered by Google" mark beside the results, and a `/privacy` page linked from
the footer that says what the app stores and gives a takedown contact.

## Trade-offs accepted

- **No server cache.** The responses carry no `Cache-Control`, so the terms leave no room for one;
  the debounce protects the quota instead.
- **No per-user rate limit.** One author uses it, and a runaway client would show in the first
  search.
- **No retry on Google's `503`.** It answered `503` twice in a row on 2026-10-08, then recovered.
  The endpoint answers `502`, the form says search is unavailable, and manual entry still works.
- **Noisy ranking.** The right book is often third, so ten results are shown and the user picks.
- **The key is restricted to the Books API only.** Render's free tier has no stable IP, so an IP
  restriction is not possible.

## Cost

New: `server/services/googleBooksService.js`, a controller action and route,
`client/components/book-search.tsx`, `client/app/privacy/page.tsx`, a test for each, a section in
`docs/features/books.md`. Edited: the book model, Zod schema and DTO, the add form, the shelf
list, the footer, `server/.env.example`, the roadmap. Render gets `GOOGLE_BOOKS_API_KEY`. No
dependencies. Roughly 400 lines.

## Open questions

- Settled 2026-10-09: the official "powered by Google" asset came from the author, a 62×30 PNG
  like the file the guidelines link, and the takedown contact is the public GitHub issues page.
- Does the deployed backend's region get the same results from the API as a local run?
