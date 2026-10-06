# Design: book forms — add, edit, delete

## Problem

The dashboard (`client/app/dashboard/page.tsx`) is read-only. A new user signs up and sees "No
books here yet." with no way to add one, although `POST`, `PATCH` and `DELETE /api/books` all
exist and are tested. Separately, the API cannot clear an optional field: the `PATCH` schema
(`server/validation/bookSchemas.js`, `createBookSchema.partial()`) accepts a field absent or set,
and rejects `null` — so a rating, once given, can never be removed.

## Out of scope

Cover URL, description and reading dates in the UI (the API already takes them), search, sort,
pagination, cover images, the external book search of stage 7.

## Scale assumptions

One user editing their own shelf, one tab at a time.

## Approach

**Add:** an "Add a book" button on the dashboard opens an inline form — title, author, status.
On success the form closes and the list refetches.

**Edit and delete:** each title in the list links to `/dashboard/books/[id]`, a page with one
form: title, author, status, rating (`No rating`, 1–5) and review. Save sends a `PATCH`; Delete
asks `window.confirm`, sends `DELETE` and returns to the dashboard. A missing or someone else's
book shows "Book not found" — the API already answers `404` for both. The page reads its id with
`use(params)`: in this Next.js version `params` is a `Promise`, per the bundled
`dynamic-routes.md`.

**Clearing a field:** the `PATCH` schema makes every optional field nullable; `null` means
"clear it". Mongoose stores `null`, and the DTO already omits `null`, so the response shape does
not change. Required fields (`title`, `author`, `status`) stay non-nullable. `startedAt` and
`finishedAt` are coerced dates — `null` must not become 1970; a test pins that.

**Client code:** `client/lib/books.ts` gains `useBook(id)`, `createBook`, `updateBook`,
`deleteBook`. Every mutation revalidates all `/api/books…` keys through `swr`'s global `mutate`,
so the list is fresh whichever filter is open. The forms live in `client/components/` so they can
be tested without a router. The redirect-when-signed-out effect, duplicated once the book page
exists, moves into a shared `useRequireAuth()` hook. Forms stay plain `useState` with HTML
`required`, like login and register; the server's Zod schema is the real validation and its
message is shown on failure.

## Trade-offs accepted

- **`window.confirm` for delete**, not a custom modal — native, accessible, and enough for one
  irreversible action.
- **No optimistic updates.** The UI changes after the server confirms. At this scale the wait is
  a few hundred milliseconds.
- **Save sends every field of the form, not only the changed ones.** Two tabs editing the same
  book would overwrite each other (last write wins). No real user does that here.
- **No client-side validation library.** The course's own project uses react-hook-form + yup;
  this one does not need it for five fields, and the server already validates.

## Cost

New: `client/components/add-book-form.tsx`, `client/components/edit-book-form.tsx`,
`client/app/dashboard/books/[id]/page.tsx`, `client/lib/use-require-auth.ts`, tests for both
forms, this doc. Edited: `client/lib/books.ts`, `client/app/dashboard/page.tsx`,
`server/validation/bookSchemas.js`, `server/test/books.test.js`, `docs/features/books.md`,
`docs/ROADMAP.md`. No new dependencies. Diff: roughly 450 lines.

## Open questions

- Whether a book's detail page should also be where stage 7's external search fills in a cover
  and description — would favour putting those fields on this page now. Not decided; nothing
  here blocks either answer.
