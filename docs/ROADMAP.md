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

## Current focus — course submission MVP

The project is being submitted as a replacement pet project for a course homework. The
course's general criteria: React/Next.js with TypeScript, a UI matching a design/spec that
works on mobile and tablet, semantic valid markup, no browser console errors, formatted code
without extra comments, a README (about, stack, design, spec), and a live deployment. This
list takes priority over the stage order below; items marked "stage N" pull that stage
forward.

Decisions:

- **English everywhere** — UI, docs, code. Other interface languages come later (see Backlog).
- **No Firebase.** The course's Firebase criterion belongs to its own project #1; this project
  keeps its Express + MongoDB backend, and the README says why. Revisit only if the mentor
  insists.
- **No mockup.** The design is our own; the README shows screenshots and links this roadmap as
  the spec.

In order:

0. ✅ Commit the stage 5 book list work
1. ✅ Upgrade Next.js past the critical advisory in `16.2.10` (GHSA-p293-qw3h-jr36) — now
   `16.3.8`. What `npm audit` still reports in `client/` is the ESLint plugin chain
   (`@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`): dev-only, never
   shipped, waiting on an upstream fix. `server/` audit is still to do before deploy (item 6)
2. ✅ `GET /api/auth/me` answers `200` with `null` for a signed-out visitor instead of `401` —
   the browser logs every 4xx as a console error, so every logged-out page load showed one
3. ✅ Book forms: add a book, change status, rating and review, delete (rest of stage 5) —
   [designs/book-forms.md](designs/book-forms.md)
4. ✅ Home page (stage 6), a header with navigation, a real page title, responsive layout,
   dark mode fixed — [designs/site-shell.md](designs/site-shell.md)
5. ✅ Prettier for both packages (shared config, exact-pinned, enforced by `verify`, which now
   also type-checks the client); code comments moved out of the code (the course reads "no
   comments" literally) into `docs/` — see [testing.md](testing.md); `CLAUDE.md`'s Comments
   rule changed with it
6. ✅ Deploy (stage 10) — [designs/deploy.md](designs/deploy.md). Live: frontend
   `https://my-shelfie-ecru.vercel.app` (Vercel), backend `https://my-shelfie.onrender.com`
   (Render). `/api` goes through Next.js rewrites so the session cookie is first-party —
   `vercel.app` and `onrender.com` are different sites, and Safari blocks third-party cookies
   by default. Checked in a browser on 2026-10-08: sign-in survives a reload, the cookie is
   invisible to JavaScript, the console is clean. Render's free tier sleeps; the README warns
   that the first request can take up to a minute
7. ⬜ README: ✅ what it is, stack, why not Firebase, link to this roadmap, live URL;
   ⬜ screenshots (add them under `docs/screenshots/` and reference them from the README)
8. ✅ Final check on the deployed site, 2026-10-08. The W3C Nu validator reports 0 errors and
   0 warnings for the served HTML of `/`, `/login`, `/register` and `/dashboard`. No page
   scrolls horizontally at 320, 375, 768 and 1440 px (home, login, register, dashboard, book
   page). The console is empty signed in and signed out. Logout clears the session, and
   `/dashboard` then redirects to `/login`. Not covered: a visual review by eye, a real
   phone, and Safari

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

- ✅ Frontend auth: `useAuth`/`AuthProvider`, login/register forms, session-aware routing,
  logout — [features/auth.md](features/auth.md),
  [designs/frontend-auth.md](designs/frontend-auth.md)
- ✅ The user's book list with a status filter (all / want / reading / read / dropped),
  wired to the API via `swr` — [designs/book-list.md](designs/book-list.md)
- ✅ A manual add-book form + a review/rating form, delete —
  [designs/book-forms.md](designs/book-forms.md)
- ✅ Client test scaffolding: Vitest + React Testing Library, `npm run verify` in `client/`

## Stage 6 — Public home page ✅

- ✅ Available without registration, prerendered as static content
- ✅ A description of the service — [designs/site-shell.md](designs/site-shell.md)

## Stage 7 — Book search via an external API

Built 2026-10-09 — [designs/google-books-search.md](designs/google-books-search.md),
[features/books.md](features/books.md). Backend `GET /api/books/search`, the search box in the
add form, covers on the shelf, the "Powered by Google" mark and the `/privacy` page. Checked
against the real API and in a browser on a throwaway test database; not yet deployed — Render
needs `GOOGLE_BOOKS_API_KEY` first.

- ✅ Integration with the Google Books API, to auto-fill a book card when adding one
- ⬜ Caching query results — dropped on purpose: the terms leave no room for it (see below)
- ⬜ Check what the deployed backend's region gets back from the API (see the last bullet of
  the constraints)

Checked live on 2026-10-06: Google Books answers `429` to every request without a key (the
anonymous quota is shared and spent), so it needs our own key; Open Library works without one
but finds almost no Ukrainian titles (it files "Тіні забутих предків" under its English title,
and has no Zhadan or Zabuzhko).

**Decision: Google Books, with our own key, as the only source.** Re-run with a key on
2026-10-07: it found every title tested — Kotsiubynsky, Shevchenko, Zhadan's "Інтернат",
Zabuzhko, Bulgakov, Weir — where Open Library found none of the modern Ukrainian ones. No
second source until a real gap shows up. What the run showed for the implementation:

- **Free-text `q` only.** `inauthor:Жадан` and `intitle:… inauthor:…` return 0 for Cyrillic;
  "Інтернат Сергій Жадан" as plain text finds the book.
- **Ranking is noisy.** The right book is often third, behind books *about* Ukrainian
  literature, and English titles come with foreign-language summaries. Show around ten results
  with author, year and cover so the user picks; many entries have no cover, author or
  description, so every field is optional in the UI.
- **Cover thumbnails come as `http://`.** Rewrite to `https://` on the backend, or the deployed
  HTTPS site gets mixed-content warnings in the console.
- **Responses carry no `Cache-Control` header**, so the terms leave no room for a long-lived
  cache. Quota protection comes from debouncing on the client, not from storing results.
- **0.5–2 s per search** — needs a visible loading state.

Constraints from Google's terms, read on 2026-10-06 — the stage 7 design must honour them:

- **The key stays secret.** Google APIs ToS: credentials "may not be embedded in open source
  projects" — this repository is public. The key lives only in `server/.env` and the host's
  environment variables, never a `NEXT_PUBLIC_` variable; the browser talks to our backend,
  never to Google with the key.
- **Attribution** (Books branding guidelines): a "powered by Google" logo adjacent to search
  results, the official asset unaltered; every result links prominently to its Google Books
  page (`infoLink` / `canonicalVolumeLink`). Nothing may suggest Google endorses the app.
- **No permanent copies of Google content.** Google APIs ToS §5 forbids building databases or
  keeping copies longer than the response's cache headers allow. What a user saves to their
  shelf is their own entry: title and author pre-filled but editable, the Google volume id,
  and the cover as a URL pointing at Google rather than a stored image. The description is
  shown live or not stored — never copied into `Book.description`. The backend's search cache
  respects the cache headers.
- **A privacy policy page** describing what the app collects (email, name, password hash,
  reading list) — required for any API client by the Google APIs ToS.
- **A takedown contact.** Books API ToS: remove content alleged to infringe third-party rights
  and give rights holders a way to ask — a contact on the privacy page covers it.
- **Free to use.** Books API ToS forbids charging users without Google's agreement.
- **Respect quotas** — debounced search input on the client, a cache on the server, no
  rotating keys to get around limits.
- **Results depend on the server's location.** The API restricts results "based on your server
  or client application's IP address"; check what the deployed backend's region gets back.

## Stage 8 — AI chat (Gemini API)

- `POST /api/chat` on Express, proxying requests to Gemini (the key stays on the backend
  only)
- A chat widget in the dashboard, to help find books and information about them

## Stage 9 — Polish

- ✅ Visual refresh, 2026-10-09 — [designs/visual-refresh.md](designs/visual-refresh.md): a palette
  from the author's colour card in a light and a dark theme, Playfair Display and Inter with
  Cyrillic, stat cards, a "Currently reading" strip and a list/grid view on the dashboard
- Search/sort/filter in the personal list
- Error handling, loaders, empty states
- Responsive layout

## Stage 10 — Deploy ✅

Done as MVP item 6 — see [designs/deploy.md](designs/deploy.md).

- Backend → Render/Railway
- Frontend → Vercel
- MongoDB Atlas
- Environment variables on both platforms

## Backlog of ideas (post-MVP)

Yearly reading goals, statistics/charts of what was read, tags/genres, list export, a public
user profile, social features. Interface translations (the UI is English-only for now).

---

Descriptions of individual features will be added to `docs/` as separate files as they are
built.
