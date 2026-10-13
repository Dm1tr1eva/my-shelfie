# Feature: auth

**Last verified against code:** 2026-10-13

## What it does

Register, log in, log out, and know who is currently signed in — the identity every other
feature (books) is scoped to. Backend since Stage 3; the frontend (this doc's newest part)
lets a browser actually use it.

## Invariants

- A session is a JWT in an `httpOnly` cookie, never readable from JavaScript, never stored in
  `localStorage`.
- Login answers the same generic error either way — "no such email" and "wrong password"
  both read `Invalid email or password`, and the page shows one banner without naming a field.
  Registration, by design, does say that an email is taken (`409`): the create-account page
  shows it under the email field with a link to sign in. See the trade-offs.
- Both bodies are validated with a strict schema (`server/validation/authSchemas.js`) before
  anything touches the database: an email that is not a string is a `400`, never a query.
- The frontend never talks to MongoDB, and never sees a password hash; it only ever sees
  `{ id, email, name }`.

## Endpoints

All mounted at `/api/auth`.

| Method and path | Auth required | Answers |
|---|---|---|
| `POST /register` | no | `201` with `{ id, email, name }`. `400` with `field: message` unless `email` is a valid address (at most 254 characters), `name` is 1–100 characters and `password` is 8 characters to 72 bytes; unknown fields are rejected. `409` if the email is taken. Does **not** set the session cookie — a client must call `/login` after. |
| `POST /login` | no | `200` with `{ id, email, name }`, sets the `token` cookie (`httpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV` is `production`, 7-day `maxAge`). `401` on any credential mismatch; `400` when `email` or `password` is missing or not a string. Accounts saved with a shorter password keep signing in: the length rule is on registration only. |
| `POST /logout` | no | `204`, clears the `token` cookie with the same attributes. Must be a server round trip: `httpOnly` means client JS cannot delete the cookie itself. |
| `GET /me` | no | `200` with `{ id, email, name }` for the signed-in user. `200` with `null` when there is no session: no cookie, an invalid or expired token, or a token whose user no longer exists. |

**Why `/me` answers `null` instead of `401`:** the frontend calls it on every page load to find
out who is signed in, and "nobody" is the normal answer for a first visit, not an error. The
browser logs every 4xx response as a console error no matter how the code handles it, so a
`401` here put a red error in the console of every signed-out visitor — and the course this
project is submitted to requires a clean console. `/me` therefore goes through
`optionalAuth` (sets `req.userId` when the cookie is valid, never rejects), while every books
route keeps `requireAuth` (`401` on a missing or invalid cookie). Both share one token check,
`readUserId` in `server/middleware/auth.js`.

## Shape

Backend: `controllers/authController.js` still calls the `User` model directly (two layers,
not three) — unlike `books`, not yet migrated; see `CLAUDE.md`'s applicability note. Frontend
(`client/`): `lib/api.ts` (a `fetch` wrapper — always `credentials: "include"`, throws
`ApiError` with the backend's message) and `lib/auth-context.tsx` (`AuthProvider`/`useAuth`,
the single source of session state, checks `/me` once on mount). `app/login`,
`app/register` are thin pages around Client Components (`login-form.tsx`,
`register-form.tsx`, with show/hide password in `auth-fields.tsx`) — no Server Actions. Both
send you to `/library` afterwards; `/dashboard` only redirects there. The create-account page
validates per field with the same rule as the server and falls back to a banner for an error it
cannot place. Design: [public-pages.md](../designs/public-pages.md).

**Why not Next.js's own auth pattern** (Server Actions + `next/headers` `cookies()` + Proxy):
that model assumes Next.js itself issues and reads the session cookie. Here the session is
issued by a separate Express origin. On `localhost` a host-only cookie happens to cross ports,
so it would appear to work in dev — but Stage 10 deploys the two to different real domains
(Vercel, Render), where a Next.js server process could never read it. Route protection is
client-side only: `AuthProvider` redirects on `status === "anonymous"`. This is a UX trade-off
(a flash of blank page before the redirect), not a security one — `requireAuth` still gates
every API response regardless of what the page shows. With the Stage 10 rewrites (below) the
cookie ends up on the Next.js origin, but Express still issues and checks it, so the
client-side model stays.

## Cross-origin cookies

The browser only exposes a credentialed response (`fetch` with `credentials: "include"`, how
the frontend sends the `httpOnly` cookie) when the server names the exact origin and answers
`Access-Control-Allow-Credentials: true`; a wildcard origin is refused. So the backend runs
`cors({ origin: CLIENT_URL, credentials: true })`, and `client/lib/api.ts` always sends
`credentials: "include"`. A bare `cors()` looks fine in a server-side test and fails only in a
real browser.

## Same origin through rewrites

`vercel.app` and `onrender.com` are different sites, so a cookie set by the API would be
third-party to the page, and Safari blocks those by default. The frontend therefore never calls
the API origin: `client/next.config.ts` rewrites `/api/:path*` to `API_ORIGIN`, and
`client/lib/api.ts` requests relative paths. The browser sees one origin, so the cookie is
first-party and CORS is not exercised from the browser — it stays configured for direct API
use. Development takes the same route, so a cookie bug shows locally. Whether the proxy passes
`Set-Cookie` through unchanged is confirmed by hand after the first deploy, per
[designs/deploy.md](../designs/deploy.md).

## Trade-offs accepted

- **`authController.js` is still two layers**, not three. Out of scope for the frontend-auth
  PR; migrates when auth is next touched substantially, same as the note in `CLAUDE.md`.
- **No CSRF token.** The cookie is `SameSite=Lax`, set explicitly (and `Secure` in
  production), which blocks the classic cross-site form-post CSRF shape. A `Lax` cookie is
  still sent on top-level GET navigations, which is acceptable because no GET endpoint changes
  state.
- **Client-side-only route gating** — see Shape.
- **A taken email is revealed at registration.** The handoff asks for it, and without email
  verification the alternative is a confusing silent failure. No rate limit on registration:
  one deployment, a handful of users (principle 2); revisit if it is ever opened wider.
- **A length rule only.** No strength meter and no breached-password check.
- **A failed login still answers `401`, and still shows up in the console.** That one is a
  real failure the user caused and is told about on the page; bending the status code to
  hide it would make the API lie. Only `/me`, where "nobody signed in" is the normal state,
  was changed.
- **Client auth tests mock `fetch`**, they do not hit a live server the way the backend's
  Atlas integration tests do. The live cross-origin cookie round trip was checked by hand in
  a real browser for this PR (register → reload persists the session → logout → direct
  `/dashboard` visit while signed out redirects → login with the same credentials).

## Recovery

No known drift scenario yet — no user-deletion endpoint, no way for a `token` to outlive the
user it names except the JWT's own 7-day expiry, which self-heals.

## ADRs

None yet.
