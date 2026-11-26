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
- Durations and easings come only from the motion tokens; `app/motion-rules.test.ts` fails on
  a hand-picked `duration-[…]`, `ease-[…]` or `delay-[…]`, and on an `animate-*` that is not a
  token (Tailwind's own `spin`, `ping`, `pulse`, `bounce` are allowed).
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
it ends; when the element has no animation (jsdom, or no CSS) it calls `onDone` at once.
`Drawer` (× , Escape, scrim), `ConfirmDialog` (Cancel, Escape, scrim), the popover card
(Escape, a click outside) and `Toast` (its timer, ×) close through it.

**Opening**: `Drawer` slides up as a sheet below 768px and in from the right above, with the
scrim fading; dialogs and popovers pop in from their origin; the account menu and the select
and tag-input lists pop in; toasts rise; the series details expand with a fade on phones.

## Trade-offs accepted

- **A close caused by the action itself is instant**: "Show N books", Save, Delete, Undo and
  Retry unmount at once, because what the reader looks at next is the result.
- **The account menu and the list boxes close instantly.** The menu is a native `<details>`;
  animating its close needs script for one rarely used menu.
- **Pressed is opacity for most controls.** One rule covers every link and button; a control
  that needs another look sets its own `active:` class.
- **The add-a-book flow is not covered here**: its modal is being rebuilt in its own branch,
  under the same rule.
- **Hover on touch screens** follows the browser: some keep the hover look until the next tap.

## Recovery

Nothing is stored.

## ADRs

None.
