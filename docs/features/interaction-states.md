# Feature: interaction states and motion

**Last verified against code:** 2026-11-26

## What it does

Every control answers the pointer, the keyboard and the finger, and whatever appears or
disappears moves instead of jumping, unless the reader asked the system for reduced motion. The
rule is in `CLAUDE.md` ("UI states and motion"); this page is what is in place.

## Invariants

- Every link, button, summary, field and option has hover, `focus-visible`, active (pressed) and
  disabled states, from the shared classes or the base styles below.
- The focus ring is always visible from the keyboard: `:focus-visible` draws a 2px navy outline
  (light on navy surfaces, `focus-visible:outline-page`), and below 768px the page keeps
  `6rem` of scroll padding above the floating tab bar so a focused element is never under it.
- Durations and easings come only from the motion tokens. `app/motion-rules.test.ts` fails on
  an arbitrary or numeric Tailwind duration, delay or easing (`duration-[…]`, `duration-300`,
  `delay-75`, `ease-in-out`, `ease-linear`), on an arbitrary property `[transition…:…]` or
  `[animation…:…]`, on `animate-[…]`, on `transition…` or `animation…` in a JSX
  `style={{…}}` attribute, on a time or a `cubic-bezier` in `globals.css` outside `@theme`, on
  an `animate-*` that is not a token (Tailwind's own `spin`, `ping`, `pulse`, `bounce` are
  allowed), when the reduced-motion block stops applying to `*`, `::before` and `::after`, and
  on any time in that block other than `1ms` or `0ms`. A style object built outside a JSX
  attribute is not checked: reading every object literal for motion keys would flag data, not
  styles.
- A panel, dialog, popover or toast never stays half-gone: if its parent keeps it after the
  closing animation, it comes back and can be closed again.
- With `prefers-reduced-motion: reduce` every transition and animation lasts 1ms: changes are
  instant, and `animationend` still fires, so a closing panel still closes.

## Shape

**Tokens** (`client/app/globals.css`, `@theme`):

| Token | Value | Used for |
|---|---|---|
| `--duration-fast` | 120ms | hover, press, colour changes (the default for every `transition*`) |
| `--duration-base` | 200ms | fades, pop-ins, closing, small movements |
| `--duration-slow` | 300ms | a panel or sheet sliding in |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | everything that appears or changes |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | everything that leaves |

Animations, each with an `-in` and an `-out`: `fade` (scrims, expanded details), `pop` (dialogs,
popovers, menus, list boxes), `rise` (toasts), `sheet` (bottom sheets below 768px), `panel` (side
panels from 768px).

**Base styles** (`@layer base`): links, buttons, summaries, fields and options get a colour,
opacity and transform transition on `--duration-fast`; a pressed link or button is at 80%
opacity unless its own class says otherwise; a disabled control shows `cursor: not-allowed`.
`.btn-primary`, `.btn-outline`, `.btn-beige`, `.btn-round`, `.field` and `.link` carry their own
hover and pressed looks.

**Closing** (`client/lib/use-exit.ts`): `useExit(ref, onDone)` returns `leaving`, `leave` and
`onAnimationEnd`. `leave()` switches the element to its `-out` animation and calls `onDone` when
that animation ends (only its own: a child's `animationend` bubbling up is ignored; asking
twice calls `onDone` once); with no animation (jsdom, no CSS) it calls `onDone` at once. If
`onDone` returns `true` the parent is removing the element on its own time (a navigation) and it
stays in its last frame; otherwise it returns to its open state, so a parent that keeps it never
leaves an invisible layer over the page. `Drawer` (×, Escape, scrim), `ConfirmDialog` (Cancel,
Escape, scrim), the popover card (Escape, a click outside) and `Toast` (its timer, ×) close
through it. `Drawer` also takes `beforeClose`, asked before the animation starts: the book panel
passes its "save what is unsaved" there, so a failed save keeps the panel open with its error
instead of sliding it away first, and its `onClose` navigates and returns `true`.

**Opening**: `Drawer` slides up as a sheet below 768px and in from the right above, with the
scrim fading; dialogs and popovers pop in from their origin; the account menu and the select
and tag-input lists pop in; toasts rise; the series details expand with a fade on phones.

## Trade-offs accepted

- **A close caused by the action itself is instant**: "Show N books", Save, Delete, Undo and
  Retry unmount at once, because what the reader looks at next is the result.
- **The account menu and the list boxes close instantly.** The menu is a native `<details>`;
  animating its close needs script for one rarely used menu.
- **A kept element slides back in.** When a parent keeps a closed drawer, dialog or popover,
  it replays its opening animation; nothing in the app keeps one today (the book panel asks
  `beforeClose` first).
- **A close that navigates trusts the navigation.** The book panel's `onClose` returns `true`,
  so if `router.back()` never landed the panel would stay in its last frame; no such case is
  known.
- **Pressed is opacity for most controls.** One rule covers every link and button; a control
  that needs another look sets its own `active:` class.
- **The add-a-book flow is not covered here**: its modal is being rebuilt in its own branch,
  under the same rule.
- **Hover on touch screens** follows the browser: some keep the hover look until the next tap.

## Recovery

Nothing is stored.

## ADRs

None.
