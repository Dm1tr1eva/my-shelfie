# Design: a visible loading state while the session is checked

## Problem

Every private page waits for `GET /api/auth/me` before it knows who is signed in
(`client/lib/auth-context.tsx`, status `loading`). Until the answer comes, each page returns
`null` (`return null` in the guard of `library.tsx`, `next-to-buy.tsx`, `book-page.tsx` and the
others) and the frame draws only the logo (`app-frame.tsx`). The backend sleeps on Render's free
tier, so after a pause that wait is up to a minute: the screen looks frozen, and the page
skeletons only appear once the answer arrives.

## Out of scope

- Keeping the server awake (a ping job, a paid instance).
- Caching the last session or the last library to show it while waiting.
- A splash screen with artwork; a timeout that gives up on the request.

## Scale assumptions

One component and one conditional in the frame. It matters on the first request after about
15 minutes of silence and on every cold start of the installed app.

## Approach

`AppFrame` knows the session status. While it is `loading` and the path is not a public one, it
shows `AuthLoading` in place of the page: a spinner, the words "Loading your library…" in a
status region, and after five seconds a second line saying the server is waking up and that this
can take up to a minute. The public paths (`/`, `/login`, `/register`, `/privacy`) render at
once, as they do not depend on the answer. The spinner stops for people who ask for reduced
motion; the text carries the meaning.

The list is of public paths, not private ones, so a private page added later gets the loader
without anybody remembering to register it. The loader is in the server-rendered HTML too (the
initial status is `loading`), so it shows before any script runs, which also covers an installed
app starting from nothing.

**Alternative that lost:** replacing each page's `return null` with the loader. Seven copies of
one line, and a page added later would forget it.

## Trade-offs accepted

- An unknown address shows the loader until the session answers, then the 404 page.
- After five seconds the message is shown even when the delay is a slow network, not a sleeping
  server; the wording ("can take up to a minute") fits both.
- If the request fails, the status becomes anonymous and the sign-in page opens, as before.

## Cost

New: `components/auth-loading.tsx` and its tests. Changed: `components/app-frame.tsx`. About 60
lines, no dependency.

## Open questions

- Whether to wake the server earlier, from the public pages, so the sleep is over before sign-in.
  Decide after seeing how often the message shows.
