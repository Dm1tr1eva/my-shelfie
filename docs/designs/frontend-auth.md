# Design: frontend authentication

## Problem

`client/` is an unmodified `create-next-app` skeleton — one page that pings `/api/health`. The
backend already has working register/login/`/me` (`server/routes/auth.js`), but nothing on the
frontend calls it, and two backend gaps block it from working at all: `app.use(cors())`
(`server/app.js:12`) sends `Access-Control-Allow-Origin: *` with no
`Access-Control-Allow-Credentials`, which makes a browser refuse any `credentials: 'include'`
response; and `GET /api/auth/me` (`server/routes/auth.js:10`) answers only `{ userId }`, not
enough to render "signed in as ___".

## Out of scope

The book list/forms (rest of Stage 5) — this PR only gets a user from "no session" to "signed
in, can see a protected page, can sign out." Server-side rendering of authenticated data,
Proxy-based route protection (see Approach), password reset.

## Scale assumptions

Same as the rest of the project: one deployment, one developer, no other consumer of this API.

## Approach

Next.js's own auth guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`)
assumes the session is issued and read by Next.js itself — Server Actions call `cookies()`,
Proxy (the renamed `middleware`) decrypts the session cookie at the edge. That model does not
fit here: the session is a JWT issued by a separate Express origin. On `localhost` a host-only
cookie happens to cross ports, so a Next.js Route Handler on :3000 could accidentally read a
cookie set by :5000 — but Stage 10 deploys frontend and backend to different real domains
(Vercel, Render), where that never happens. Building on the dev-only coincidence would work
locally and break in production. So: plain client-side SPA auth, the same shape the guide shows
for the Pages Router as the simpler alternative — `fetch` from a Client Component, session
state in memory, not the Next.js-owns-the-cookie model.

`lib/api.ts` — a fetch wrapper: base URL from `NEXT_PUBLIC_API_URL`, always
`credentials: 'include'`, throws a typed error with the backend's `{ error }` message.

`lib/auth-context.tsx` — `AuthProvider` + `useAuth()`. On mount, calls `GET /api/auth/me`;
`null` on 401 means signed out, not an error. Exposes `login`, `register`, `logout`, `user`,
`status` (`loading | authenticated | anonymous`).

`app/login/page.tsx`, `app/register/page.tsx` — controlled forms, plain `useState`, no
Server Actions (the mutation is a cross-origin fetch, not a database call Next.js can reach).

`app/dashboard/page.tsx` — a stub proving the flow end-to-end: while `status === "loading"`
show nothing; `anonymous` redirects to `/login` via `useRouter`; `authenticated` shows
"Welcome, {name}" and a sign-out button. The book list replaces the stub in the next PR.

Backend: `cors({ origin: process.env.CLIENT_URL, credentials: true })`; `GET /api/auth/me`
looks up the user and returns `{ id, email, name }`, matching register/login's shape;
`POST /api/auth/logout` clears the cookie server-side — client JS cannot, it is `httpOnly`.

## Trade-offs accepted

- **Client-side-only route gating.** No Proxy-based redirect, so an anonymous visitor briefly
  sees a blank page before the client-side redirect fires. Acceptable: `requireAuth` still
  guards every API response regardless of what the page shows, so this is a UX flicker, not a
  security gap. Revisit only if server-rendered protected content is ever needed.
- **No auth test-suite parity with the server's Atlas integration tests.** Client tests
  (Vitest + React Testing Library, new dependencies — no existing way to render/assert on a
  React component or hook without one) mock `fetch`; they prove `AuthProvider`'s state
  transitions, not a live round trip. The manual end-to-end check in this PR's report is what
  proves the live cookie flow actually works.

## Cost

New: `client/lib/api.ts`, `client/lib/auth-context.tsx`, `client/app/login/page.tsx`,
`client/app/register/page.tsx`, `client/app/dashboard/page.tsx`, `client/.env.example`, a
Vitest config and one test file, this doc. Edited: `client/app/layout.tsx` (wrap in
`AuthProvider`), `server/app.js` (CORS), `server/controllers/authController.js` (`/me`
payload), `client/package.json` (`verify` script). New dependencies: `vitest`,
`@testing-library/react`, `jsdom`.

## Open questions

- `CLIENT_URL` on the backend — one origin is enough while there is one frontend deployment.
