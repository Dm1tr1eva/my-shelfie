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
`client/.env.local` and fill in `NEXT_PUBLIC_API_URL`.

Backend (port 5000):

```bash
cd server && npm run dev
```

Frontend (port 3000):

```bash
cd client && npm run dev
```

To confirm the chain is alive: `GET http://localhost:5000/api/health` answers
`{"status":"ok"}`, and the frontend home page shows `Backend status: ok`.

## Checks before a commit

```bash
cd server && npm run verify
```

Runs `server/test/**/*.test.js` through the built-in `node:test` runner, sequentially — the
tests share one database.

**`verify` needs access to MongoDB Atlas over port 27017.** Tests run against a separate
database: `MONGODB_URI_TEST`, or, when that is unset, the database name from `MONGODB_URI` plus
a `-test` suffix. Every collection is cleared between tests, so the helper refuses to start if
the resolved database is the development one.

```bash
cd client && npm run verify
```

Runs `eslint`, then the Vitest suite (`*.test.tsx` next to the code it tests, e.g.
`lib/auth-context.test.tsx`). No network or database needed — component/hook tests mock
`fetch`. What they cannot prove is a real cross-origin cookie round trip; check that by hand
in a browser after a change to auth or CORS (see `docs/features/auth.md`).

## Known network problem

Some networks — public Wi-Fi, corporate ones — block outbound port 27017 entirely. Both
`npm run dev` and `npm run verify` then hang and fail with `MongooseServerSelectionError` /
`ReplicaSetNoPrimary`. This is not a bug in the code. A quick check:

```bash
cd server && node -e "const s=require('net').createConnection({host:'ac-sekiheg-shard-00-00.ndq8ueu.mongodb.net',port:27017,timeout:8000});s.on('connect',()=>{console.log('OPEN');s.destroy()});s.on('timeout',()=>{console.log('BLOCKED');s.destroy()});s.on('error',e=>console.log('ERROR',e.code))"
```

`BLOCKED` means the network, not the code. The other source of the same error is an IP missing
from Network Access in Atlas.
