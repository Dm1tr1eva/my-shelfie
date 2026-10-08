# my-shelfie documentation

The index. A session starts here: this file, then the plan, then the feature doc and ADRs for
the area you are about to change.

## What lives where

| Document | About |
|---|---|
| [ROADMAP.md](ROADMAP.md) | The plan: stages, status, decisions taken and alternatives rejected. This is the `plan.md` that `CLAUDE.md` refers to. |
| [designs/](designs/) | Design docs, written before non-trivial work, at most 600 words |
| [features/](features/) | One doc per feature. The shape is defined by [features/TEMPLATE.md](features/TEMPLATE.md) |
| `adr/` | One decision per file. Empty so far. |
| [testing.md](testing.md) | Pitfalls hit while testing, recorded here because the code has no comments |
| [../CLAUDE.md](../CLAUDE.md) | Working agreements: what precedes code, what counts as done |

## Bringing the project up

Dependencies are installed **only inside `client/` and `server/`**, never from the repository
root.

```bash
cd server && npm install
```

```bash
cd client && npm install
```

Configure the environment: copy `server/.env.example` to `server/.env` and fill in
`MONGODB_URI`, `JWT_SECRET` and `CLIENT_URL` (the frontend's origin — CORS needs an exact
match to allow the credentialed requests auth depends on); copy `client/.env.example` to
`client/.env.local` — its one variable, `API_ORIGIN`, defaults to `http://localhost:5000`, so
the file is optional locally. The browser never calls the backend directly: Next.js proxies
`/api/*` to `API_ORIGIN`.

Backend (port 5000):

```bash
cd server && npm run dev
```

Frontend (port 3000):

```bash
cd client && npm run dev
```

To confirm the backend is alive: `GET http://localhost:5000/api/health` answers
`{"status":"ok"}`. The frontend at `http://localhost:3000` shows the home page; registering
and landing on `/dashboard` proves the cookie round trip between the two.

## Deploying

Two services from this repository, designed in [designs/deploy.md](designs/deploy.md). Live
since 2026-10-08: frontend `https://my-shelfie-ecru.vercel.app`, backend
`https://my-shelfie.onrender.com`.

| | Backend | Frontend |
|---|---|---|
| Host | Render, Web Service, free tier | Vercel |
| Root directory | `server` | `client` |
| Build / start | `npm install` / `npm start` | Vercel's Next.js defaults |
| Environment | `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (the Vercel URL), `NODE_ENV=production`; `PORT` is set by Render | `API_ORIGIN` (the Render URL, no trailing slash) |

Create the Render service first, then Vercel. Set `API_ORIGIN` before the Vercel build: the
rewrite destination is baked in at build time, so changing it later needs a redeploy. Atlas
Network Access must let Render in (`0.0.0.0/0`). The free Render service sleeps after 15
minutes without traffic and takes about a minute to wake on the next request.

## Checks before a commit

```bash
cd server && npm run verify
```

Checks formatting with Prettier, then runs `server/test/**/*.test.js` through the built-in
`node:test` runner, sequentially — the tests share one database.

**`verify` needs access to MongoDB Atlas over port 27017.** Tests run against a separate
database: `MONGODB_URI_TEST`, or, when that is unset, the database name from `MONGODB_URI` plus
a `-test` suffix. Every collection is cleared between tests, so the helper refuses to start if
the resolved database is the development one.

```bash
cd client && npm run verify
```

Runs `eslint`, a TypeScript check (`tsc --noEmit`), the Prettier check, then the Vitest suite
(`*.test.tsx` next to the code it tests, e.g. `lib/auth-context.test.tsx`). No network or
database needed — component/hook tests mock `fetch`. What they cannot prove is a real cross-origin cookie round trip; check that by hand
in a browser after a change to auth or CORS (see `docs/features/auth.md`).

## Formatting

Prettier, one shared config in the repository root (`.prettierrc.json`), pinned to an exact
version in both packages. `npm run format` rewrites files; `npm run format:check` is what
`verify` runs. Line endings are LF (`.gitattributes`); a file saved with CRLF on Windows fails
the check until `npm run format` is run. Markdown is not formatted — docs are hand-wrapped.

The code carries no comments (see `CLAUDE.md`, Comments); the reasoning lives in the design and
feature docs and in [testing.md](testing.md).

Commits that only reformat or strip comments are listed in `.git-blame-ignore-revs`. Once per
clone, so that `git blame` skips them:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## Known network problem

Some networks — public Wi-Fi, corporate ones — block outbound port 27017 entirely. Both
`npm run dev` and `npm run verify` then hang and fail with `MongooseServerSelectionError` /
`ReplicaSetNoPrimary`. This is not a bug in the code. A quick check:

```bash
cd server && node -e "const s=require('net').createConnection({host:'ac-sekiheg-shard-00-00.ndq8ueu.mongodb.net',port:27017,timeout:8000});s.on('connect',()=>{console.log('OPEN');s.destroy()});s.on('timeout',()=>{console.log('BLOCKED');s.destroy()});s.on('error',e=>console.log('ERROR',e.code))"
```

`BLOCKED` means the network, not the code. The other source of the same error is an IP missing
from Network Access in Atlas.
