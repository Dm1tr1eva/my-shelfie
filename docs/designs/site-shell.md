# Design: site shell — home page, header, titles, responsive layout

## Problem

What a visitor sees first is the `create-next-app` leftover: the home page
(`client/app/page.tsx`) prints "Backend status: ok", every tab is titled "Create Next App"
(`client/app/layout.tsx:16`), and there is no navigation — the only way out of a page is the
browser's address bar; logging out lives in the dashboard body. Dark mode is broken too:
`globals.css` switches the background to `#0a0a0a` under `prefers-color-scheme: dark`, while
every primary button is hard-coded `bg-black`, so on a dark-mode OS the buttons all but vanish.

## Out of scope

Branding beyond a name and a neutral palette, illustrations, a waking ping for the free-tier
backend (deploy, MVP item 6), interface translations.

## Scale assumptions

Desktop, tablet (768px) and phone (375px) widths; the course checks all three.

## Approach

**Shell.** The root layout renders `<SiteHeader>` above every page and a static
`<SiteFooter>` (project name, GitHub link) below. The header is a Client Component reading
`useAuth()`: signed out — "Log in", "Register"; signed in — "My shelf", the user's name,
"Log out"; while the session check is in flight — nothing, so it never flashes the wrong
links. Logout moves here from the dashboard and does not navigate: protected pages already
send a signed-out visitor to `/login` through `useRequireAuth`, and a second redirect from the
header would race it.

**Home page (stage 6).** A static Server Component, prerendered: a headline, one paragraph on
what the app does, three short feature blocks (track, filter, rate and review), and a call to
action. The call to action is the only auth-aware part, a small Client Component: "Go to my shelf" when signed
in, otherwise "Get started" and "Log in" — including while the session check is still in
flight, because a free-tier backend can take up to a minute to wake and an empty hero for that
long reads as broken. The health-check line goes;
`/api/health` stays on the backend.

**Titles.** The bundled `generate-metadata.md` is explicit: `metadata` exports work only in
Server Components, and the recommended shape is a Server Component `page.tsx` that exports
`metadata` and renders the interactive part from a separate file. So each page splits: login,
register, dashboard and the book page keep a thin server `page.tsx` with a title, and their
current body moves to `client/components/`. The root layout sets
`{ default: "my-shelfie", template: "%s · my-shelfie" }`. The book page's title is the static
"Edit book" — the server cannot fetch the book: the session cookie belongs to the API's
origin, not Next.js's.

**Theme.** Primary buttons use the existing tokens — `bg-foreground text-background` — which
already flip in dark mode, instead of `bg-black text-white`. `body` uses the Geist font the
layout already loads; `globals.css` currently overrides it with Arial.

**Responsive.** Mobile-first Tailwind: the header wraps on narrow screens, forms go full width
below `sm`. Checked in the browser at 375, 768 and desktop widths.

## Trade-offs accepted

- **Client-rendered header.** Auth state lives in the browser, so the header's links appear
  after the session check. The empty slot during that check is the honest alternative to
  guessing and flashing the wrong links.
- **Generic title for the book page** — see Titles.

## Cost

New: `client/components/site-header.tsx`, `site-footer.tsx`, `hero-actions.tsx`,
`login-form.tsx`, `register-form.tsx`, `dashboard.tsx`, `book-editor.tsx`, a test for the
header and the hero actions, this doc. Edited: every `page.tsx`, `app/layout.tsx`,
`app/globals.css`, `docs/ROADMAP.md`. No new dependencies. Diff: roughly 400 lines, most of it
moved rather than new.

## Open questions

- A real logo and colour palette — worth it for the portfolio, not needed for the course.
