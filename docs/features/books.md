# Feature: books

**Last verified against code:** 2026-09-14

## What it does

Lets a signed-in user keep a personal list of books: add one by hand, list and filter it,
read or edit a single entry, remove one. No sharing, no catalogue shared across users — one
list per user, matching the Stage 0 scope decision in [../ROADMAP.md](../ROADMAP.md).

## Invariants

- A book always belongs to exactly one user (`Book.userId`), set once at creation from the
  authenticated session and never from the request body.
- `status` is one of `want | reading | dropped | read`; `rating`, when present, is `1`–`5`.
- A caller can only see, change or delete their own books. A book that exists but belongs to
  someone else is indistinguishable, from the outside, from a book that does not exist.

## Endpoints

All routes are mounted at `/api/books` and require `requireAuth` (a valid `token` cookie).

| Method and path | Answers |
|---|---|
| `POST /` | `201` with the created book. `500` on a Mongoose validation error — see Trade-offs. |
| `GET /` | `200` with `{ books, total, page, limit }`, scoped to the caller. `?status=` filters; `?page=`/`?limit=` paginate (default `page=1`, `limit=20`). |
| `GET /:id` | `200` with the book. `404` if it does not exist, belongs to another user, or `:id` is not a valid ObjectId. |
| `PATCH /:id` | `200` with the updated book. `400` if the body carries no field from the allow-list, or a value fails Mongoose validation (bad `status`, `rating` out of range, blanked-out `title`/`author`). `404` under the same three conditions as `GET /:id`. |
| `DELETE /:id` | `204` with no body. `404` under the same three conditions as `GET /:id`. |

**What "field absent" means on `PATCH`:** a field missing from the body is left untouched.
Only fields present in [`UPDATABLE_FIELDS`](../../server/controllers/bookController.js) are
ever written; anything else in the body — `userId`, `_id`, `createdAt` — is silently dropped,
not rejected. A body with none of those fields present answers `400`.

## Data

One collection, `Book` (`server/models/book.js`): `userId`, `title`, `author`, `coverUrl`,
`description`, `status`, `rating`, `review`, `startedAt`, `finishedAt`, plus `createdAt` /
`updatedAt` from `timestamps: true`.

No index beyond the default `_id` exists yet. `GET /` filters on `userId` and sorts on
`createdAt` without one — see Trade-offs.

## Trade-offs accepted

- **No `{ userId: 1, createdAt: -1 }` index.** At a personal-shelf scale (hundreds of rows per
  user) an unindexed scan is fast enough to not matter yet. Add it if a list is ever slow, or
  before Stage 10 deploy, whichever comes first.
- **Offset pagination, not cursor.** `CLAUDE.md` asks for cursor pagination on time-ordered
  lists; this project's own applicability note exempts it at this scale. Revisit if a list
  can exceed a few thousand rows or gains inserts while a page is being read.
- **Two layers, not three.** Controllers call the Mongoose model directly; there is no service
  or repository layer yet. `CLAUDE.md` calls this a migration to do when the module is next
  touched substantially, not a blocker for adding endpoints.
- **Controllers return the Mongoose document, not a DTO.** `__v` and internal shape leak to
  the client. Acceptable for a solo learning project with no other consumer of the API yet;
  revisit before anyone but this frontend reads these responses.
- **Validation is Mongoose schema validation only**, not a dedicated library (Zod/Joi is still
  on the roadmap for this stage). This means `POST /` returns a generic `500` on a validation
  failure instead of PATCH's `400` — `createBook` does not distinguish `ValidationError` from
  any other failure the way `updateBook` does. Narrow and worth fixing, not yet done.
- **No rate limiting, no idempotency key on `POST /`.** A double-submit creates two books. No
  concrete user action produces this today (one browser tab, no retry logic on the frontend
  yet), so it is not built — see `CLAUDE.md` principle 2.

## Recovery

No known way, today, for a book to end up orphaned (`userId` pointing at a deleted user) or
stuck in an inconsistent state — there is no user-deletion endpoint yet and every write goes
through the ownership-scoped queries above. If that changes, the fix for an orphaned book is
a direct Mongo query:

```js
db.books.deleteMany({ userId: { $nin: db.users.distinct("_id") } })
```

## ADRs

None yet.
