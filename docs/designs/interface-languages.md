# Design: the interface in English, Russian and Ukrainian

## Problem

Every word of the interface is written into the components in English (about forty files under
`client/components/`, `client/app/` and `client/lib/`), the `lang` of the page is fixed to
`en`, and the browser tab titles come from static metadata. The author and the people she
writes for read Russian and Ukrainian.

## Out of scope

- Translating what the user wrote: titles, authors, tropes, notes, custom genres, series names.
- Translating the answers of the server: only the messages the interface shows are mapped (see
  below); the API keeps answering in English.
- Right-to-left languages and regional date formats.
- A language per account; the choice lives in the browser.

## Scale assumptions

Three languages, a few hundred short messages, one user per browser.

## Approach

**Own small layer, no library.** `next-intl` and the like route by locale prefix or read
cookies on the server, which turns every page dynamic; this site is client-rendered after the
session check, so a prefix would only add a second copy of every address. The layer is a
dictionary per language, a `t("area.key", { vars })` function and a provider:

- **Source of truth is English.** `lib/i18n/messages/en/<area>.ts` define the keys; Russian
  and Ukrainian files must have the same shape. The type is derived from English, so a
  missing or extra key fails `tsc`, and a test checks that every `{placeholder}` of an English
  message appears in its translations.
- **Plurals** use `Intl.PluralRules`: an entry is `{ one, few, many, other }`, English needs
  only `one` and `other`. Russian and Ukrainian use all four.
- **Choosing the language.** The stored choice in `localStorage`, otherwise the browser
  language (`uk`, `ru`, anything else is English). The server HTML is English, so a first hard
  load of a Russian page shows English for the moment before the script runs.
- **Switching.** A three-button control (EN, RU, UK) in the public header and the account
  menu. It also sets `<html lang>` and the tab title.
- **Missing key** falls back to English and then to the key itself; nothing renders blank.
- **Outside a provider** (tests) the language is English, so tests keep asserting English text.

**What is translated.** All fixed text, including the filter and status labels, the
twelve default genres (stored in English, shown translated; custom genres are shown as typed),
form hints and errors, empty and loading states, the install steps, the privacy page. Server
messages the forms show (sign-in and registration errors) are mapped from their exact English
text; an unknown message is shown as it comes.

**Alternative that lost:** locale in the URL (`/uk/library`). Better for search engines, which
do not index the private pages anyway, and costs a route layer, redirects after sign-in and a
second source of truth with the saved choice.

## Trade-offs accepted

- English flashes briefly on a hard load for Russian and Ukrainian readers.
- Tab titles are set by script after load; the server title stays English for crawlers.
- The choice does not follow the account to another device.
- Mapping server messages by exact text breaks silently if the server rewords one; the
  fallback is the English text, which is readable.
- No native review of the translations beyond the author's own reading.

## Cost

New: `lib/i18n/` (core, provider, messages) and tests. Changed: about forty components and
pages, the privacy page, docs. A large diff with no behaviour change in English.

## Open questions

- Whether the author prefers other Russian or Ukrainian names for the default genres.
