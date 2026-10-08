# my-shelfie

A personal book tracker. Keep one shelf of the books you want to read, are reading, have
finished or dropped, and give each of them a rating and a short review of your own.

**Live site:** <https://my-shelfie-ecru.vercel.app>

The backend runs on Render's free tier and sleeps after 15 minutes without traffic, so the first
request after a pause can take up to a minute.

## Features

- Registration, login and logout. The session is a JWT in an `httpOnly` cookie.
- A private shelf for every user: add, edit and delete books.
- A status for each book — want to read, reading, read or dropped — and a filter by status.
- A rating from 1 to 5 and a text review.
- A public home page, a header with navigation, and a mobile-first layout.

## Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, SWR |
| Backend | Node.js, Express 5, Zod, bcrypt, jsonwebtoken |
| Database | MongoDB Atlas, Mongoose |
| Tests | Vitest and Testing Library (client), the built-in `node:test` runner (server) |
| Tooling | ESLint, Prettier, TypeScript type checking |
| Hosting | Vercel (frontend), Render (backend) |

## How it fits together

```
browser ──► Vercel (Next.js) ──/api/* rewrite──► Render (Express) ──► MongoDB Atlas
```

The browser only ever talks to the Vercel origin. Next.js proxies `/api/*` to the Express
service, so the session cookie is first-party: `vercel.app` and `onrender.com` are different
sites, and browsers such as Safari block third-party cookies by default. The books module on the
backend is split into controller, service and repository layers and answers with DTOs rather
than raw database documents. Every query is scoped to the signed-in user, and a book that
belongs to someone else answers `404`.

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` | Account and session |
| `GET /api/auth/me` | The signed-in user, or `null` |
| `POST /api/books`, `GET /api/books` | Create a book, list the user's books (status filter, pagination) |
| `GET`, `PATCH`, `DELETE /api/books/:id` | Read, update or delete one book |

Details: [docs/features/auth.md](docs/features/auth.md) and
[docs/features/books.md](docs/features/books.md).

## Why not Firebase

The course's reference projects use Firebase for authentication and data. This project is built
on its own Node.js, Express and MongoDB API instead, on purpose: it exists to practise the whole
stack, and Firebase would replace exactly the parts being practised — password hashing, token
sessions, request validation and the data layer. Authentication and the books API are covered by
tests, and the frontend is React with TypeScript, as the assignment requires.

## Design and specification

There is no separate mockup: the design is the site itself, kept deliberately plain. The
specification is [docs/ROADMAP.md](docs/ROADMAP.md) — the stages, the decisions taken and the
alternatives rejected. Each larger piece of work has a short design document in
[docs/designs/](docs/designs/).

## Run it locally

You need Node.js and a MongoDB Atlas cluster (the free tier is enough).

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Fill in `MONGODB_URI`, `JWT_SECRET` and `CLIENT_URL` in `server/.env` first. The backend listens
on port 5000.

```bash
cd client
npm install
npm run dev
```

The frontend runs at <http://localhost:3000> and proxies `/api/*` to `http://localhost:5000`;
set `API_ORIGIN` in `client/.env.local` to point it elsewhere. Install dependencies inside
`client/` and `server/` only, never from the repository root.

Each package has one command that runs all of its checks:

```bash
npm run verify
```

In `client/` it runs ESLint, the TypeScript check, the Prettier check and the Vitest suite. In
`server/` it runs the Prettier check and the integration tests, which need Atlas reachable on
port 27017 and use a separate `-test` database. The full runbook, including deployment, is in
[docs/README.md](docs/README.md).

## What is next

Book search through the Google Books API to fill in a book's details, and an AI assistant
(Gemini) that helps find books. Both are planned in the roadmap.
