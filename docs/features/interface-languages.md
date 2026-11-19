# Feature: interface languages

**Last verified against code:** 2026-11-06

## What it does

The whole interface can be read in English, Russian or Ukrainian. A three-button switch (EN, RU,
UK) sits in the public header and in the account menu; the choice is kept in the browser.
Design and the reasons for an own small layer instead of a library:
[../designs/interface-languages.md](../designs/interface-languages.md).

## Invariants

- English is the source. `client/lib/i18n/messages/en/<area>.ts` define the keys; the Russian and
  Ukrainian files have the same shape, enforced by the type `Localized<typeof en>` and by
  `messages.test.ts` (same keys, no empty text, the same `{placeholders}`, all four plural forms).
- A missing translation falls back to English, then to the key; nothing renders blank.
- What the user wrote (titles, authors, notes, tropes, custom genres) is never translated. The
  twelve default genres are stored in English and shown translated.
- Tests render in English: outside a browser preference the language is English.

## Shape

- `lib/i18n/core.ts`: the locales, the key and message types, `translate` (placeholders,
  `Intl.PluralRules` plurals, fallback).
- `lib/i18n/index.ts`: a module-level store read with `useSyncExternalStore`: `useT()`,
  `useLocale()`, `setLocale()`. The server render is English; the stored choice, otherwise the
  browser language (`uk`, `ru`, else English), is applied on the client.
- `lib/i18n/domain.ts`: `useDomain()` names for reading status, ownership, format, series state,
  link kind and language, and default genres.
- `lib/i18n/server-errors.ts`: maps the exact English messages of the API that a screen can show
  to translated text; an unknown message is shown as it comes.
- Areas: `shell`, `domain`, `home`, `auth`, `library`, `book`, `add`, `series` (with Next to buy
  under `series.next`), `privacy`, `errors`.
- `components/language-switch.tsx` is the control; `components/locale-effects.tsx` sets
  `<html lang>` and the tab title from the path.

## Trade-offs accepted

- English shows for a moment on a hard load for a Russian or Ukrainian reader (the server HTML is
  English).
- Tab titles are set by script; crawlers see English titles.
- The choice does not follow the account to another device.
- Server messages are mapped by exact text; a reworded server message falls back to English.
- A book found by search with no author is saved with "Unknown author" in the language that was
  on at the time.
- The translations have not had a native review beyond the author's own reading.

## Recovery

None needed: nothing is stored on the server. A wrong stored choice is cleared by switching, or
by removing `my-shelfie:locale` from the browser's local storage.
