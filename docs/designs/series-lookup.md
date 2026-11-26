# Design: series lookup

## Problem

Google Books has no series data (`services/googleBooksService.js:6`), so the add flow
(handoff decisions 26–28) cannot offer "#1 in series". Decided with the author:
Google Books, Open Library and Wikidata found 7 of 40 test series (0 of 15 Russian or
Ukrainian); FantLab is rejected; Claude Haiku 5.5 with web search found 38 of 40, ~$0.027 and
~9 s a lookup.

## Out of scope

Client UI; writing to user data (the client confirms and saves through existing endpoints);
a second provider.

## Scale assumptions

Few users, tens of lookups a day, one instance, open registration.

## Approach

**`POST /api/series/lookup`**, signed in. Strict body: `title`, `authors` (1–5), optional
`subtitle`, `isbn`, `googleVolumeId`, `language`. Answers `result: "series"` (series, number,
confidence, sources), `"standalone"`, `"unknown"`.

**Seam.** `services/seriesLookup/provider.js` picks the adapter named by
`SERIES_LOOKUP_PROVIDER` (only `anthropic`); the model is `SERIES_LOOKUP_MODEL`. An adapter
returns a validated answer or `null`; prompt and answer schema are shared. The official
`@anthropic-ai/sdk` is added: typed errors and API versioning would otherwise be hand-written.

**The call.** `web_search_20260318` with `allowed_callers: ["direct"]` (the measured setup),
`max_uses: 5`, effort `medium`, no SDK retry, 45 s timeout. Structured outputs exclude
citations, so the model writes JSON only, validated by strict Zod: ≤ 60 books, names ≤ 150
characters, ≤ 5 sources (trial maxima: 11, 55, 5). Otherwise, `refusal`, `max_tokens`, a search
error or a second pause → `unknown`, uncached; an SDK error → `502`.

**`max_tokens` 4000.** Output tokens include hidden thinking and search queries: trial average
1815, median 1699, maximum 3182, JSON ≤ 1338 characters. A cap of 2000 would cut 13 of 40
lookups, 3000 two, 3500 none.

**Budget, not retries.** Three searches missed a fourteen-book series. Five cost ≤ $0.02 more;
a retry doubles the wait.

**Prompt fixes** from the trial: a title that is also the series name gets its number; a
shared world is not a series; no unsourced books or placeholder titles; announced books need a
source (Litnet counts); long series: find a whole bibliography. Today's date is given.

**Sources are checked**: only URLs its searches returned survive; none left → `low`.

**Cache shared by all users** ([ADR 0001](../adr/0001-shared-reference-data.md)):
`series_lookups` (per series and edition language, never overwritten while fresh) and
`series_lookup_books` (input hash → series and number, or standalone). A fresh series listing
the title by the same author answers without the model. TTL: 7 days for `low`, 180 for a
finished series, else 30.

**Cost guard.** Trigger: open registration and a paid call per lookup; a client loop or script
spends without bound. Defence: a per-user daily cap of model calls
(`SERIES_LOOKUP_DAILY_LIMIT`, default 30; cache hits free), one atomic upsert; over it `429`.
Many accounts: the monthly spend limit in the Claude Console.

**Eval.** `scripts/series-lookup-eval.js`, only with `--run` and a key. The trial's list
stays out of this public repository (a personal reading list).

## Trade-offs accepted

- **A crafted title can put a wrong series in the shared cache.** Others only see it as a
  suggestion; Recovery deletes it.
- **No global cap**: the Console limit is the ceiling, then lookups answer `502`.
- **Translated author names split entries.**
- **A cache hit is faster**: timing reveals someone looked the book up, not who.
- **Two parallel misses** both call the model.
- **New error texts** are untranslated until the client step.

## Cost

SDK dependency; three models, two repositories, adapter files, service, route, eval script,
ADR, feature doc, ~90 tests. Edited: `index.js`, `.env.example`, deploy notes, privacy texts. Render needs `ANTHROPIC_API_KEY`.
~$0.03 a model call.

## Open questions

Settled in review: `low` answers live 7 days; the client tells `unknown` from `standalone`.
