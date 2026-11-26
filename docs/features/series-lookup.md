# Feature: series lookup

**Last verified against code:** 2026-11-26

## What it does

Tells the add-a-book flow whether a book belongs to a series: the series' name, the book's number,
the other books with their numbers, which are not out yet and when they are expected, whether the
series is finished, how sure the answer is and which web pages it came from. Google Books has no
series data, so a model with web search answers, and the answer is cached for everyone. It only
suggests: the client shows the result, the user confirms, and saving goes through the existing
book and series endpoints. Design: [../designs/series-lookup.md](../designs/series-lookup.md).

## Invariants

- The lookup never writes to a user's books or series. Its only writes are the shared cache and
  the caller's usage counter.
- The model's text never reaches the client. Only an answer that passes the Zod schema in
  `services/seriesLookup/answer.js` is used; anything else is `unknown`.
- Every source returned was among the URLs a web search returned in that same lookup. An answer
  left with no source has confidence `low`.
- The cache holds no user id ([ADR 0001](../adr/0001-shared-reference-data.md)).
- A fresh series entry is never overwritten: a later answer for the same series only replaces
  an entry whose `expiresAt` has passed.
- An answer is at most 100 books, and every name and title at most 200 characters, so the
  endpoint cannot relay long text from the model.
- A user makes at most `SERIES_LOOKUP_DAILY_LIMIT` model calls a UTC day; cache hits are free,
  and a server without a key answers `503` before anything is counted.
- The API key is sent only to `https://api.anthropic.com`; `ANTHROPIC_BASE_URL` is ignored. It
  is never logged or returned.

## Shape

`controllers/seriesLookupController.js` → `services/seriesLookupService.js` (cache, limit,
storing) → `repositories/seriesLookupRepository.js` (shared cache) and
`repositories/seriesLookupUsageRepository.js` (per user). The model is reached through
`services/seriesLookup/provider.js`, which picks the adapter named by `SERIES_LOOKUP_PROVIDER`.
An adapter takes the validated query and returns `{ answer, reason, usage }`: `answer` is the
parsed answer or `null`, `reason` says why it is `null`. `prompt.js` and `answer.js` belong to no
provider; a second adapter reuses them and adds one entry to the provider's map.

**The Anthropic adapter** (`anthropicAdapter.js`): model `SERIES_LOOKUP_MODEL` (default
`claude-haiku-5-5`), effort `medium`, `max_tokens` 8000, tool `web_search_20260318` with
`allowed_callers: ["direct"]` and `max_uses: 5`, no SDK retries, 45 s timeout. The JSON is read
from the text after the last search block. One `pause_turn` is continued by sending the paused
content back, with the same tool: the API counts the searches of earlier requests in a continued
turn against `max_uses`, so a turn makes five searches at most in all (sending the remainder
instead would count them twice). The continuation sends the first results again, billed once
more as input tokens. A second pause leaves the answer `unknown`. `refusal`, `max_tokens` and a search error
(other than `max_uses_exceeded`, which only means the model wanted more searches) make it
`unknown`. An SDK error (`APIError`, network included) is logged with its class and status and
answers `502`; a missing key answers `503`.

## Endpoints

| Method and path | Who may call it | Answers |
|---|---|---|
| `POST /api/series/lookup` | a signed-in user (`401` otherwise) | `200` with a result; `400` on an invalid body; `429` over the daily limit; `502` when the provider fails; `503` without a key |

Body, strict (an unknown field is `400`): `title` (1–200), `authors` (1–5, each 1–200),
optional `subtitle` (1–300, Google's subtitle), `isbn` (ISBN-10 or 13, spaces and dashes
removed), `googleVolumeId` (`[A-Za-z0-9_-]`, up to 40), `language` (a code such as `ru`,
`uk`, `pt-BR`).

```json
{ "title": "Шестерка воронов", "authors": ["Ли Бардуго"], "language": "ru" }
```

```json
{
  "result": "series",
  "series": {
    "name": "Шестерка воронов",
    "originalName": "Six of Crows",
    "status": "complete",
    "books": [
      { "number": 1, "title": "Шестерка воронов", "released": true },
      { "number": 2, "title": "Продажное королевство", "released": true }
    ]
  },
  "number": 1,
  "confidence": "high",
  "sources": [{ "url": "https://en.wikipedia.org/wiki/Six_of_Crows", "domain": "en.wikipedia.org" }]
}
```

`result` is `series`, `standalone` (`confidence` and `sources` only) or `unknown` (nothing else).
`number` is absent when the input names the whole series or no source gives it; `originalName`
and `expectedYear` are absent when unknown; an unreleased book has `released: false`. `status` is
`ongoing`, `complete` or `unknown` — the values `Series.status` already has; `expectedYear`
becomes a `Series.expected` entry with `source: "ai"` when the client saves it. Error texts:
`Daily series lookup limit reached`, `Series lookup is unavailable right now`, `Series lookup is
not configured`, and `Failed to look up the series` for anything unexpected.

## Data

- `series_lookups`, one per series and edition language: `seriesKey` (normalised original
  name, normalised name in the edition's language and the sorted normalised authors of the input,
  unique), `name`, `originalName`, `status`, `books`, `confidence`, `sources`, `titleKeys`
  (normalised input title, series names and book titles, indexed), `titleNumbers` (normalised
  title → number, for the book titles and the input title), `authorKeys`, `expiresAt`. The
  edition name is in the key because a fresh entry is not overwritten: with one entry per
  series, the Ukrainian edition would be answered with the Russian names.
- `series_lookup_books`, one per input: `bookKey` (SHA-256 of the normalised title, authors,
  subtitle, ISBN, volume id and language, unique), `title` and `authors` as sent (for the
  operator), `seriesLookupId` (`null` for a standalone), `number`, `confidence`, `sources`,
  `expiresAt`.
- `series_lookup_usage`: `userId`, `day` (UTC, `YYYY-MM-DD`), `count`, `expiresAt`; unique
  `{ userId, day }`. A reservation is one conditional upsert; a duplicate-key error from two first
  calls of the day is retried once as a plain conditional update.

Normalising: Unicode NFKC, lower case, `ё` → `е`, typographic apostrophes → `'`, quotes removed,
spaces collapsed. Every `expiresAt` has a TTL index, so MongoDB deletes expired entries, and
reads also skip them. An answer with confidence `low` lives 7 days; a series that is
`complete` with every book out, 180; anything else, standalones included, 30. Failures are not
cached; they still count toward the limit.

**Lookup order:** the book key; then a fresh series whose `titleKeys` hold the input title and
whose `authorKeys` share an author (the number comes from `titleNumbers`); then a model call.
A model answer for a series that already has a fresh entry is not stored; the book key points
at the existing entry and keeps the number from the answer.

## Trade-offs accepted

- **A crafted request can put a wrong series into the shared cache**, if it is the first to ask
  about that series. The title and subtitle are free text in the prompt, and the series answers
  later lookups of any title it lists by the same author. It cannot replace a fresh entry. Others
  see it only as a suggestion with its sources; Recovery deletes it. A standalone answer is only
  served for the exact same input.
- **The endpoint relays model text within the answer's size limits**: up to 100 titles of 200
  characters, after the prompt asked for book data. Anything longer, or not shaped as an answer,
  is `unknown`; the daily limit bounds how often.
- **The per-user limit does not stop many accounts.** The monthly spend limit set in the Claude
  Console is the ceiling; past it the API refuses and lookups answer `502`.
- **No retry.** The trial saw no transient failure; a retry doubles a wait that is already about
  ten seconds, and the user can add the book by hand.
- **Five searches, not three.** At most $0.02 more a lookup, for long series that three could
  not cover.
- **Author names in another script make separate cache entries** ("Сара Дж. Маас" and "Sarah
  J. Maas").
- **Two parallel misses for one series both call the model**; the first write stays.
- **A fresh entry does not learn new books.** A book announced after the entry was written
  waits for the entry to expire (30 days for a series still coming out).
- **Model and price are not checked at start.** A model id the API does not know answers `502`
  on the first lookup and is logged.
- **The client does not translate the new error texts yet**; the client step adds them.

## Observability

Each model call logs one line, `series_lookup.model_call`, with the provider, model, result
(`series`, `standalone` or `unknown:<reason>`), requests, searches and tokens — never the title,
the user or the key. Cost per call at Claude Haiku 5.5 list prices is about $0.0001 per 1,000
input tokens plus $0.01 per search.

## Checking the prompt

`server/scripts/series-lookup-eval.js` replays reference books through the real adapter and
scores series, number, listed books and announced books as the November 2026 trial did. It runs
only with `--run`, `--refs <file>` and `ANTHROPIC_API_KEY`, defaults to ten books, and prints
the cost. The trial's reference list is not in the repository: it is the author's own reading
list and the repository is public.

Run on 2026-11-26 with this prompt, on the trial's eight failures and four control books (12
calls, $0.37, 7–15 s each): series 12/12, number 8/9, books listed 10/10, announced 2/4. Fixed
against the trial: the number when the title is also the series name (Королевство шипов и роз,
Ковен озера Шамплейн), two standalones no longer turned into series (Ноктикадия, Серпентарий),
and the long series now lists 13 of 14 books instead of 11. Still wrong: «Академия 505» gets no
number, and the announced next books of Двор ледяных сердец and Королевская кровь are missed.
No lookup used more than three of its five searches.

## Recovery

Delete a wrong answer so the next lookup asks the model again (mongosh, on the production
database):

```js
const s = db.series_lookups.findOne({ name: "<series name as returned>" })
db.series_lookup_books.deleteMany({ seriesLookupId: s._id })
db.series_lookups.deleteOne({ _id: s._id })
```

A wrong standalone answer: `db.series_lookup_books.deleteMany({ title: "<title>", seriesLookupId:
null })`. Everything at once: `db.series_lookups.deleteMany({})` and
`db.series_lookup_books.deleteMany({})`. To lift one user's limit for today:
`db.series_lookup_usage.deleteOne({ userId: ObjectId("<id>"), day: "<YYYY-MM-DD>" })`. To stop
model calls without a code change, set `SERIES_LOOKUP_DAILY_LIMIT=0` on Render.

## ADRs

- [0001: reference data with no user data may be shared across users](../adr/0001-shared-reference-data.md)
