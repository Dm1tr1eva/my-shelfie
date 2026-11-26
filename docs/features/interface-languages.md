# Feature: interface languages

**Last verified against code:** 2026-11-26

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
- Russian and Ukrainian address the reader as «ты» («Добавь», «Войди», «Попробуй ещё раз»;
  «Додай», «Увійди», «Спробуй ще раз»; «твоя полка», «твоя полиця»), the privacy page included.
  No form may reveal a gender: a past tense about the reader is rephrased without a subject
  («Вход в аккаунт не выполнен», «выбранная тобой книга», «спасибо за терпение»). No word for
  buying («купить», «купити»): Next to buy reads «Что взять дальше» / «Що взяти далі». The rule
  comes from the v3 handoff's `copy.md`; English is unaffected.

## Shape

- `lib/i18n/core.ts`: the locales, the key and message types, `translate` (placeholders,
  `Intl.PluralRules` plurals, fallback).
- `lib/i18n/index.ts`: a module-level store read with `useSyncExternalStore`: `useT()`,
  `useLocale()`, `setLocale()`. The server render is English; the stored choice, otherwise the
  browser language (`uk`, `ru`, else English), is applied on the client.
- `lib/i18n/domain.ts`: `useDomain()` names for reading status (`bookStatus` says Listening /
  Listened for an audiobook), ownership, format, series state, link kind and language, default
  genres, the six preset moods (stored in English like default genres) and Would recommend.
- `lib/i18n/server-errors.ts`: maps the exact English messages of the API that a screen can show
  to translated text; an unknown message is shown as it comes.
- Areas: `shell`, `domain`, `home`, `auth`, `library`, `book`, `add`, `series` (with Next to buy
  under `series.next`), `privacy`, `errors`.
- `components/language-switch.tsx` is the control; `components/locale-effects.tsx` sets
  `<html lang>` and the tab title from the path through `lib/use-document-title.ts`, which keeps
  that title while the path and the language stay the same (see the trade-offs). The not-found
  page calls the same hook with `shell.titles.notFound`, as its path can be anything.

## Trade-offs accepted

- English shows for a moment on a hard load for a Russian or Ukrainian reader (the server HTML is
  English).
- Tab titles are set by script; crawlers see English titles.
- The `<title>` of a page is Next metadata rendered by React, and React puts its English text back
  after the script has run: on a hard load it rewrites the text, on client navigation it inserts
  the next page's `<title>` in front. `locale-effects.tsx` therefore watches `<head>` with a
  `MutationObserver` (in `use-document-title.ts`) and writes the translated title again whenever
  it differs. When React has
  just removed its `<title>`, the browser makes a second one for the script; it stays in `<head>`,
  never more than one, and is harmless because the first `<title>` is the one shown.
- The book and series entries of the path map match one path segment only, so a deeper path
  under them, which is a not-found page, gets the not-found title. A route that matched the map
  and also rendered the not-found page would have two hooks writing two titles in turn; no route
  does that today (a missing book or series is shown by its own page, not by `not-found.tsx`).
- The choice does not follow the account to another device.
- Server messages are mapped by exact text; a reworded server message falls back to English.
- A book found by search with no author is saved with "Unknown author" in the language that was
  on at the time.
- The translations have not had a native review beyond the author's own reading.

## Recovery

None needed: nothing is stored on the server. A wrong stored choice is cleared by switching, or
by removing `my-shelfie:locale` from the browser's local storage.
