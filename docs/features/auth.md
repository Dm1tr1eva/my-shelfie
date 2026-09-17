# Feature: auth

**Last verified against code:** 2026-09-15

## What it does

Register, log in, log out, and know who is currently signed in — the identity every other
feature (books) is scoped to. Backend since Stage 3; the frontend (this doc's newest part)
lets a browser actually use it.

## Invariants

- A session is a JWT in an `httpOnly` cookie, never readable from JavaScript, never stored in
  `localStorage`.
- Login and registration answer the same generic error either way — "no such email" and
  "wrong password" both read `Invalid email or password` — so a failed attempt cannot be used
  to discover whether an email is registered.
- The frontend never talks to MongoDB, and never sees a password hash; it only ever sees
  `{ id, email, name }`.

## Endpoints

All mounted at `/api/auth`.

| Method and path | Auth required | Answers |
|---|---|---|
| `POST /register` | no | `201` with `{ id, email, name }`. `409` if the email is taken. Does **not** set the session cookie — a client must call `/login` after. |
| `POST /login` | no | `200` with `{ id, email, name }`, sets the `token` cookie (`httpOnly`, 7-day `maxAge`). `401` on any credential mismatch. |
| `POST /logout` | no | `204`, clears the `token` cookie. Must be a server round trip: `httpOnly` means client JS cannot delete the cookie itself. |
| `GET /me` | yes | `200` with `{ id, email, name }` for the signed-in user. `401` with no cookie, an invalid/expired token, or a token whose user no longer exists. |

## Shape

Backend: `controllers/authController.js` still calls the `User` model directly (two layers,
not three) — unlike `books`, not yet migrated; see `CLAUDE.md`'s applicability note. Frontend
(`client/`): `lib/api.ts` (a `fetch` wrapper — always `credentials: "include"`, throws
`ApiError` with the backend's message) and `lib/auth-context.tsx` (`AuthProvider`/`useAuth`,
the single source of session state, checks `/me` once on mount). `app/login`,
`app/register`, `app/dashboard` are plain Client Components — no Server Actions.

**Why not Next.js's own auth pattern** (Server Actions + `next/headers` `cookies()` + Proxy):
that model assumes Next.js itself issues and reads the session cookie. Here the session is
issued by a separate Express origin. On `localhost` a host-only cookie happens to cross ports,
so it would appear to work in dev — but Stage 10 deploys the two to different real domains
(Vercel, Render), where a Next.js server process could never read it. Route protection is
client-side only: `AuthProvider` redirects on `status === "anonymous"`. This is a UX trade-off
(a flash of blank page before the redirect), not a security one — `requireAuth` still gates
every API response regardless of what the page shows.

## Trade-offs accepted

- **`authController.js` is still two layers**, not three. Out of scope for the frontend-auth
  PR; migrates when auth is next touched substantially, same as the note in `CLAUDE.md`.
- **No CSRF token.** The cookie has no `sameSite` override (Express/`cookie-parser` default is
  `Lax`), which blocks the classic cross-site form-post CSRF shape; a `sameSite`/`secure`
  review is Stage 10's job, once there is a real deployment topology to threat-model against.
- **Client-side-only route gating** — see Shape.
- **Client auth tests mock `fetch`**, they do not hit a live server the way the backend's
  Atlas integration tests do. The live cross-origin cookie round trip was checked by hand in
  a real browser for this PR (register → reload persists the session → logout → direct
  `/dashboard` visit while signed out redirects → login with the same credentials).

## Recovery

No known drift scenario yet — no user-deletion endpoint, no way for a `token` to outlive the
user it names except the JWT's own 7-day expiry, which self-heals.

## ADRs

None yet.
