# Design: books module — three layers, DTOs, boundary validation

## Problem

`server/controllers/bookController.js` calls the `Book` Mongoose model directly — no service
or repository layer, violating "the database client never appears in a controller." Every
response sends the raw Mongoose document, `__v` included, instead of a DTO. Validation is
whatever Mongoose's schema enforces: `createBook` returns `500` on a bad payload instead of
`400` (`bookController.js:8`, no `ValidationError` branch, unlike `updateBook`); an unknown
`PATCH` field (`userId`, `_id`) is silently stripped rather than rejected, which the
API-and-data rule calls out by name: "unknown fields are rejected, not ignored." `getBook`
(`:33`) still lacks the `isValid(id)` guard `updateBook`/`deleteBook` have, so a malformed
`:id` throws a Mongoose `CastError` into the generic `catch` and answers `500`. No
`{ userId, createdAt }` index exists, though `CLAUDE.md`'s applicability note already
requires one.

## Out of scope

Frontend, `POST` idempotency, cursor pagination (dormant at this scale) — only `books`.

## Scale assumptions

Same as the rest of the project: one deployment, hundreds of rows per user, one developer.

## Approach

`bookRepository.js` — every Mongoose call for `Book`, `userId` as the required first
parameter (multi-tenancy rule). Absorbs the `isValid(id)` guard: an invalid id returns `null`
instead of throwing, so every caller sees "not found" uniformly — this is what fixes
`getBook`'s bug, as a consequence of the layering rather than a patch on the old code.

`bookService.js` — orchestrates the repository; a thin pass-through today, because the model
has no cross-field invariant yet. The layer exists because `CLAUDE.md`'s Shape section
mandates it outright, not speculatively.

`bookController.js` — parses and validates the body with Zod, calls the service, maps the
result through a DTO mapper, sends the response.

Validation: Zod, chosen because the current code already shows the failure mode a schema
library exists to prevent — an allow-list (`UPDATABLE_FIELDS`) tracked by hand next to a
Mongoose schema tracked by hand, one field apart from a mass-assignment bug. One schema,
`z.object({...}).strict()`, is both the allow-list and the validator; `.strict()` rejects an
unknown key instead of the old silent drop. `createBookSchema` requires `title`/`author`; the
`PATCH` schema is `createBookSchema.partial().strict()` plus a refinement that at least one
field is present. Field constraints mirror the existing Mongoose schema exactly — boundary
validation, not new constraints Mongoose never had.

DTO: `id` (string, not `_id`), `userId` (string — not secret, needed for the
"ownership survives a tamper attempt" test), the book fields, `createdAt`, `updatedAt`. `__v`
dropped. An unset optional field is omitted (matches today's implicit behaviour, where
`JSON.stringify` already drops `undefined` keys).

Index: `{ userId: 1, createdAt: -1 }` added to `server/models/book.js`.

## Trade-offs accepted

- **The service layer is a pass-through today** — required by the rules, not by a use case
  that exists yet (principle 6). Revisit if it stays empty past the next feature.
- **`PATCH` no longer silently strips `userId`/`_id` — it rejects the whole request with
  `400`.** Intentional, rule-driven; the existing test for it is rewritten to assert the new
  status, not patched around.
- **Zod is a new dependency.** Justified: hand-rolled validation already produced one
  mass-assignment-shaped near-miss in this module; a schema library removes that class of bug
  by construction.

## Cost

New: `server/repositories/bookRepository.js`, `server/services/bookService.js`,
`server/validation/bookSchemas.js`, `server/dto/bookDto.js`, this doc. Rewritten:
`server/controllers/bookController.js`. Edited: `server/models/book.js` (index),
`server/test/books.test.js`, `docs/features/books.md`, `docs/ROADMAP.md`, `CLAUDE.md`'s
applicability note. New dependency: `zod`. Diff: roughly 350–400 lines.

## Open questions

- Should `bookService` validate again, or trust the controller's Zod pass? Chosen: trust it —
  duplicating validation in two layers for already-validated data needs a concrete trigger
  (principle 2), and there isn't one.
