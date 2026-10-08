# Design: deploy — Vercel frontend, Render backend

## Problem

The app runs only on a laptop, and the course requires a live deployment. Three things in the
code block a naive deploy:

- `server/package.json` has no `start` script, and Render runs `npm start`.
- The session cookie is set with `httpOnly` only (`authController.js:42`) and cleared without
  options (`authController.js:54`). `vercel.app` and `onrender.com` are different sites, so a
  cookie set by the API is third-party to the page, and Safari blocks those by default.
- `client/lib/api.ts:1` falls back to `http://localhost:5000` when `NEXT_PUBLIC_API_URL` is
  unset, and `client/next.config.ts` is empty.

## Out of scope

A custom domain, CI beyond each host's Git integration, a staging environment, a waking ping,
the stage 7 Google Books key, monitoring.

## Scale assumptions

One developer and a handful of course reviewers. One Render instance, no load concern.

## Approach

**Same origin through rewrites.** Next.js proxies `/api/:path*` to the Render service, so the
browser only ever talks to the Vercel origin and the cookie is first-party. `next.config.ts`
gets one rewrite whose destination comes from a server-side variable, `API_ORIGIN`, defaulting
to `http://localhost:5000`. `api.ts` drops `NEXT_PUBLIC_API_URL` and always requests relative
paths, so development takes the same route as production and a cookie bug shows up locally
rather than only after deploy. The alternative, `SameSite=None; Secure` with cross-site
requests, loses to browsers that block third-party cookies — the reason the roadmap chose
rewrites.

**Cookie flags.** One shared options object, `httpOnly`, `sameSite: "lax"`, and `secure` when
`NODE_ENV` is `production`, used by login and by logout so the cleared cookie carries the same
attributes. Render gets `NODE_ENV=production` set explicitly.

**Hosts.** Backend: add `"start": "node index.js"`; Render environment `MONGODB_URI`,
`JWT_SECRET`, `CLIENT_URL` (the Vercel URL), `NODE_ENV`; `PORT` is Render's. Frontend: Vercel
Root Directory `client`, `API_ORIGIN` set to the Render URL.

**Order.** `npm audit` in `server/`, deploy Render, deploy Vercel, then a manual browser check:
register, reload, log out, and the cookie's attributes in devtools.

## Trade-offs accepted

- **Cold start.** Render's free tier spins down after 15 minutes without traffic and takes about
  a minute to wake. Vercel's proxy timeout for an external destination is 120 seconds, so the
  first request is slow but completes. No waking ping is built; the README warns.
- **Atlas open to `0.0.0.0/0`.** A free Render service has no stable outbound IP. Access is
  still gated by the database user and password.
- **750 free instance hours per month, per workspace.** One always-on service fits; the
  workspace's other free services draw on the same pool while they are awake.
- **CORS stays configured** although the browser no longer calls the API cross-origin. It is
  harmless and keeps direct API use working.

## Cost

Edited: `server/package.json`, `server/controllers/authController.js`, `client/next.config.ts`,
`client/lib/api.ts`, both `.env.example` files, the five client test files that hard-code
`http://localhost:5000` (they move to relative paths), `docs/README.md`,
`docs/features/auth.md`, `docs/ROADMAP.md`. New: this doc. No dependencies. Roughly 60 changed
lines, mostly the test URLs.

## Open questions

- Does Vercel's proxy pass `Set-Cookie` through unchanged? **Answered 2026-10-08: yes.** On
  the live site a login survives a reload, and `document.cookie` stays empty, so the cookie
  is `HttpOnly`. The `Secure` and `SameSite=Lax` attributes are covered by the server tests;
  they were not read back from the live browser.
- Which Render region sits closest to the Atlas cluster? Checked when creating the service.
