# my-shelfie — project roadmap

A tracker for books read, with a personal dashboard, manual (and later auto-filled) book
cards, a public home page, and an AI chat (Gemini) for finding books and information about
them.

**Project goal:** a learning pet project for a deep dive into React/Next.js, Node/Express and
MongoDB, aimed at a portfolio. Functionality is added stage by stage; the plan is adjusted as
work proceeds.

## Stack

- **Backend:** Node.js + Express, plain JS (TypeScript — a possible migration later, as its
  own stage)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind
- **Database:** MongoDB (Atlas) + Mongoose
- **Repository layout:** a monorepo, `/server` and `/client` folders in one git repository
- **AI:** Gemini API (requests proxied through the backend, the key never reaches the
  frontend)

## Stage 0 — Planning ✅ (decisions made)

### Data model

Scope at the start is **a single user's personal list only**: no recommendations, no public
library, no "best across users" ratings. Decided not to split a shared book catalogue from
personal data — that split only pays off once cross-user features exist, and none do yet.

**2 entities:**

```
User
- email
- passwordHash
- name

Book
- userId (ref → User)
- title
- author
- coverUrl
- description
- status: "want" | "reading" | "dropped" | "read"
- rating (1-5, optional)
- review (text, optional)
- startedAt / finishedAt
```

If cross-user features show up later (recommendations, a public library), split the shared
book fields into a `Book` collection plus a personal `UserBook` link. At a pet project's data
volume, that migration is cheap.

### Wireframes

Deferred — a sketch of the screens (home, login/register, dashboard, book page, AI chat) will
be made right before building the matching stage.

### Book data source

At the start — **manual entry** (the user types in title/author/cover themselves).
Integration with an external API (Google Books or Open Library) for auto-fill is a separate
future stage; it does not block the MVP.

## Stage 1 — Project skeleton ✅

- Monorepo: `/server` (Express) and `/client` (Next.js) in one repository
- `server`: Express in plain JS + nodemon
- `client`: Next.js (App Router) + TypeScript + Tailwind
- CORS configured between `client` (e.g. `localhost:3000`) and `server` (e.g.
  `localhost:5000`)
- A basic `GET /api/health` on the backend, requested and displayed on the frontend — proof
  the whole chain works

## Stage 2 — MongoDB and models ✅

- MongoDB Atlas + Mongoose
- `User` and `Book` schemas (see Stage 0), files `server/models/user.js` and
  `server/models/book.js`
- Connection through `.env`, connection error handling

## Stage 3 — Authentication ✅ (backend)

- Register/login: bcrypt for passwords, JWT (httpOnly cookie) —
  `server/controllers/authController.js`, `server/routes/auth.js`
- Middleware for protected routes — `server/middleware/auth.js`
- The frontend half (`useAuth` hook/context, login/register forms) — moved to Stage 5, to be
  built together with the personal dashboard

## Stage 4 — Book CRUD (backend)

- ✅ `POST /api/books`, `GET /api/books`, `GET /api/books/:id`, `PATCH /api/books/:id`,
  `DELETE /api/books/:id` — 17 tests passing, feature doc at
  [features/books.md](features/books.md)
- ✅ Request body validation via `zod`, at the controller boundary — replaces the earlier
  Mongoose-only validation
- ✅ Pagination and status filters at the API level
- ✅ The books module on three layers (controller → service → repository), with DTOs instead
  of raw Mongoose documents — [designs/books-three-layer-refactor.md](designs/books-three-layer-refactor.md)

**Stage 4 is done.**

### Test and verify scaffolding ✅

Arrived together with the rules in `CLAUDE.md`: the built-in `node:test`, `npm run verify` in
`server/`, a separate test database, `.gitattributes`. `npm run verify` passes 9/9 from a
network where port 27017 is open. The decision and the alternatives rejected —
[designs/test-and-verify-scaffolding.md](designs/test-and-verify-scaffolding.md). Documentation
index — [README.md](README.md).

## Stage 5 — Personal dashboard (frontend)

- The user's book list with filters (reading / read / want to read)
- A manual add-book form + a review/rating form
- Wired to the API (fetch/axios + SWR or React Query)

## Stage 6 — Public home page

- Available without registration, SSG/ISR on Next.js
- A description of the service

## Stage 7 — Book search via an external API (future)

- Integration with the Google Books API or Open Library, to auto-fill a book card when adding
  one
- Caching query results

## Stage 8 — AI chat (Gemini API)

- `POST /api/chat` on Express, proxying requests to Gemini (the key stays on the backend
  only)
- A chat widget in the dashboard, to help find books and information about them

## Stage 9 — Polish

- Search/sort/filter in the personal list
- Error handling, loaders, empty states
- Responsive layout

## Stage 10 — Deploy

- Backend → Render/Railway
- Frontend → Vercel
- MongoDB Atlas
- Environment variables on both platforms

## Backlog of ideas (post-MVP)

Yearly reading goals, statistics/charts of what was read, tags/genres, list export, a public
user profile, social features.

---

Descriptions of individual features will be added to `docs/` as separate files as they are
built.
