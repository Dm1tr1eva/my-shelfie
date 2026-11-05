# Design: install the site on a phone or tablet like an app

## Problem

The site opens only as a tab in a browser. The author wants it on the home screen of an iPhone
and an Android tablet, opening without the address bar. Today there is no web app manifest
(`client/app/` has `icon.svg`, `favicon.ico` and `apple-icon.png` only), no theme colour, and
the fixed bottom tab bar (`client/components/tab-bar.tsx`, `h-[78px]`) ignores the iPhone home
indicator, so in an installed app its labels would sit under it.

## Out of scope

- Offline use, a service worker, push notifications. The catalogue lives in the database and
  an offline copy would need its own conflict rules.
- App stores (Play, App Store).
- A banner that nags visitors; the install action sits in the account menu only.

## Scale assumptions

One manifest, a few static icons, one small component. No server change.

## Approach

**Manifest.** `app/manifest.ts` (a Next.js file convention): name and short name
"my-shelfie", `display: standalone`, `start_url: /library`, `scope: /`, background the page
colour, theme colour the navy of the bars. Icons: 192 and 512 px for ordinary use and a 512 px
maskable one with the artwork inside the safe circle, all rendered from `app/icon.svg` and
committed under `public/` (the SVG stays the source). A service worker is not needed for the
install prompt in Chromium (the Next.js guide says so), so none is added.

**Theme and safe areas.** The viewport gets `themeColor` and `viewportFit: cover`; `appleWebApp`
turns on standalone mode in Safari and sets the title, with the default (light) status bar,
which keeps the clock readable over the pale page. The tab bar gets
`padding-bottom: env(safe-area-inset-bottom)` and the page area its padding grows with it.

**Install action.** `lib/install.ts` exposes `useInstall()`, one of: `installed` (already
running standalone, show nothing), `prompt` (Chromium fired `beforeinstallprompt`; the button
calls it), `ios` (iPhone or iPad, where no prompt exists: show the steps "Share, then Add to
Home Screen"), `none` (anything else). `components/install-action.tsx` renders it inside the
account menu. Android Chrome and desktop Chrome and Edge take the first path, Safari on iOS the
second.

**Alternative that lost:** a PWA plugin (next-pwa and the like) with a service worker. It adds a
dependency and caching rules to solve offline use, which is out of scope.

## Trade-offs accepted

- No offline mode: without a connection the installed app shows the browser's error page.
- iOS cannot install on a tap, so iPhone users get written steps. Detection of "is this iOS" is
  by user agent; a new device that hides it just sees no action, nothing breaks.
- The install button appears only after Chromium decides the site is installable, so it can be
  absent on first visit; the browser's own menu entry still works.
- Rendered PNG icons must be regenerated when the artwork changes.
- The start page is `/library`; a signed-out user who installs lands on the sign-in page.

## Cost

New: `app/manifest.ts`, three PNGs, `lib/install.ts`, `components/install-action.tsx`, tests.
Changed: `layout.tsx`, `tab-bar.tsx`, `app-frame.tsx`, `account-menu.tsx`. About 200 lines, no
dependency.

## Open questions

- Whether iPhone users want a nudge on first visit. Decide after the author has used it.
