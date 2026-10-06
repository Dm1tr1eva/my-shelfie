# Design: book list on the dashboard

## Problem

`app/dashboard/page.tsx` is still the auth-flow stub from the previous PR — "Welcome, {name}"
and a sign-out button. The backend book endpoints (`GET /api/books`, status filter, pagination)
are done and tested (`server/test/books.test.js`, 17 cases), but nothing on the frontend calls
them.

## Out of scope

Add/edit/delete forms, rating and review UI — a separate PR once reading is in place. Pagination
controls (see Trade-offs). Sorting/search beyond the status filter the API already offers.

## Scale assumptions

Same as the rest of the project: a personal shelf, hundreds of books at most, one viewer of
their own list at a time.

## Approach

`swr`, per the ROADMAP's own listed options over React Query — it needs no provider (the app
already has one context, `AuthProvider`, and `swr`'s `useSWR` hook works without wrapping the
tree in anything else), and this page needs exactly what `swr` is built for: fetch, cache by
key, refetch on demand. React Query's mutation/invalidation machinery would earn its keep once
the add/edit PR lands, not before.

`lib/books.ts`: the `Book` type (mirrors the backend DTO —
[docs/features/books.md](../features/books.md)'s Response shape section), and `useBooks(status)`
wrapping `useSWR` keyed by `["/api/books", status]`. The key is `null` while
`useAuth().status !== "authenticated"`, so `swr` does not fetch before there is a session to
scope the list to, and automatically does once one exists.

`app/dashboard/page.tsx`: a status filter (`All | Want | Reading | Read | Dropped`, plain
buttons — a `<select>` would work as well, buttons make the current filter visibly obvious
without a legend), and the list itself: title, author, status badge, rating if present. Loading
and empty states, since a list with neither is either broken-looking or indistinguishable from
"still fetching."

## Trade-offs accepted

- **No pagination UI.** The API still defaults to `limit=20`; this page asks for `limit=100`
  explicitly so a realistic personal list is not silently truncated without pager controls to
  reach the rest. Revisit — with real pager UI, not just a bigger number — once someone's list
  is large enough to need it, matching the offset-pagination trade-off already accepted in
  `CLAUDE.md`'s applicability note.
- **No client-side caching strategy beyond `swr`'s defaults** (revalidate on focus, dedupe
  identical keys). Nothing about this list needs tuning yet — no writes exist on this page to
  invalidate a cache after.
- **Filtering happens by refetching**, not by fetching everything once and filtering in the
  browser. At hundreds of rows either would be instantaneous; refetching keeps the filter logic
  on the server, where `getBooks` already implements it and is already tested.

## Cost

New: `client/lib/books.ts`, `client/lib/books.test.ts`, this doc. Rewritten:
`client/app/dashboard/page.tsx`. New dependency: `swr`. Updated:
`docs/features/books.md` (frontend consumer note), `docs/ROADMAP.md`. Diff: roughly 150 lines.

## Open questions

- Status labels: showing the API's raw enum values (`want`, `reading`, `dropped`, `read`) vs.
  friendlier copy ("Want to read"). Chosen: friendlier copy in the UI, raw value as the button's
  underlying filter — a copy-only concern, doesn't affect the API contract.
