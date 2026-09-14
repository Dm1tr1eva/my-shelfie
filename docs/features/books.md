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

## Shape

Three layers, per `CLAUDE.md`: `controllers/bookController.js` (parses and validates the
request with Zod, calls the service, maps the result through a DTO) →
`services/bookService.js` (a thin pass-through today — no cross-field invariant exists yet
that would live here) → `repositories/bookRepository.js` (every `Book` Mongoose call,
`userId` as the required first parameter of each method). Validation schemas live in
`validation/bookSchemas.js`; the response shape in `dto/bookDto.js`.

## Endpoints

All routes are mounted at `/api/books` and require `requireAuth` (a valid `token` cookie).
Every request body is validated against a `zod` schema that mirrors `server/models/book.js`
exactly and rejects an unrecognized field — sending `userId` or `_id` in a body answers `400`,
it does not get silently dropped.

| Method and path | Answers |
|---|---|
| `POST /` | `201` with the created book. `400` on a schema violation (missing `title`/`author`, bad `status`/`rating`, an unrecognized field). |
| `GET /` | `200` with `{ books, total, page, limit }`, scoped to the caller. `?status=` filters; `?page=`/`?limit=` paginate (default `page=1`, `limit=20`). |
| `GET /:id` | `200` with the book. `404` if it does not exist, belongs to another user, or `:id` is not a valid ObjectId. |
| `PATCH /:id` | `200` with the updated book. `400` if the body carries no recognized field, or a value fails schema validation. `404` under the same three conditions as `GET /:id`. |
| `DELETE /:id` | `204` with no body. `404` under the same three conditions as `GET /:id`. |

**What "field absent" means on `PATCH`:** a field missing from the body is left untouched. A
body with none of the schema's fields present answers `400` ("No updatable fields provided").

**Response shape:** `id` (string), `userId` (string — not secret; the caller already knows it
is their own book), `title`, `author`, `status`, `createdAt`, `updatedAt`, plus whichever of
`coverUrl`/`description`/`rating`/`review`/`startedAt`/`finishedAt` are set. An unset optional
field is omitted from the object, not sent as `null`. No `_id`, no `__v`.

## Data

One collection, `Book` (`server/models/book.js`): `userId`, `title`, `author`, `coverUrl`,
`description`, `status`, `rating`, `review`, `startedAt`, `finishedAt`, plus `createdAt` /
`updatedAt` from `timestamps: true`. Compound index `{ userId: 1, createdAt: -1 }` — covers
both the filter every query uses and the sort `GET /` applies.

## Trade-offs accepted

- **Offset pagination, not cursor.** `CLAUDE.md` asks for cursor pagination on time-ordered
  lists; this project's own applicability note exempts it at this scale. Revisit if a list
  can exceed a few thousand rows or gains inserts while a page is being read.
- **The service layer has no logic of its own yet.** It exists because the three-layer shape
  is required outright, not because a use case needs it today. Revisit once a real invariant
  (e.g. `finishedAt >= startedAt`) shows up — it belongs here, not in the controller.
- **No rate limiting, no idempotency key on `POST /`.** A double-submit creates two books. No
  concrete user action produces this today (one browser tab, no retry logic on the frontend
  yet), so it is not built — see `CLAUDE.md` principle 2.

## Recovery

No known way, today, for a book to end up orphaned (`userId` pointing at a deleted user) or
stuck in an inconsistent state — there is no user-deletion endpoint yet and every write goes
through the ownership-scoped repository methods above. If that changes, the fix for an
orphaned book is a direct Mongo query:

```js
db.books.deleteMany({ userId: { $nin: db.users.distinct("_id") } })
```

## ADRs

None yet.
