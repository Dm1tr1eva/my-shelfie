# Design: v3 data model

## Problem

The v3 handoff (`design-v3/data-model.md`) needs data the API cannot store: audiobooks
(`server/constants/library.js:2` has two formats), pages, moods, quotes, desire and age, several
languages per link (`models/book.js:7` holds one), a yearly goal and a progress log. `review`
and `notes` are two fields for one meaning.

## Out of scope

Wishlist endpoint, `/api/stats`, new screens, AI, FantLab, series detection, moving `review`
into `notes` in the database.

## Scale assumptions

Hundreds of books per user, a few progress entries a week, one replica.

## Approach

**Constants.** `audio` joins `FORMATS` and `LINK_KINDS`; new `DESIRE_LEVELS`, `AGE_RATINGS`,
`RECOMMEND`, `EXPECTED_SOURCES`, mirrored in `client/lib/catalogue-constants.ts`.

**Book.** `pages`, `durationMinutes`: whole, 1–10,000, clearable with `null`, any format.
`moods`: up to 12, 1–40 characters, unique ignoring case (the genre rule, one shared helper).
`quotes`: up to 50 `{ text (1–2,000), page? (1–10,000) }`, replaced as a whole. `recommend`:
clearable enum. `desire` (default `normal`), `ageRating` (default `none`): the default is the
"unset" value, so not clearable.

**Links.** `languages`: 1–4 distinct values; a body with `language` answers `400`. The model
keeps `language` as an unvalidated legacy path; the DTO returns `languages`, or `[language]`
when empty. The Next-to-buy language filter matches any of them.

**review.** Rejected on write. The DTO returns it as `notes` when `notes` is empty, and never as
`review`. Any `PATCH` of `notes`, `null` included, unsets `review`: the UI showed the review as
the note, so the edit replaces it and clearing cannot resurrect it.

**Series.** `ageRating` (overrides a series book's own), `desire`, as on books. `expected`: up to 50 `{ number (> 0),
expectedYear? (1900–2200), source }`, numbers unique, replaced as a whole. An entry whose number
later gets a book stays; readers skip it.

**Year goal.** `User.yearGoal: { year, books }`, one goal, as the handoff only shows the current
year's. `GET /api/year-goal` answers `{ yearGoal }` or `null`; `PUT` stores `{ year
(2000–2100), books (1–1,000) }`. Its own small module (`userRepository` → service →
controller); `auth` is untouched, so its repository migration stays pending.

**Progress.** `ProgressEntry`, collection `progress_log`, in the books module: `{ userId,
bookId, date, page?, percent }`, indexes `{ userId, date: -1 }`, `{ userId, bookId, date: -1 }`.
`POST /api/progress` takes `bookId` and exactly one of `page` (0–`pages`; `400` without
`pages`) or `percent` (whole, 0–100). With `pages` both are stored: `percent = floor(page /
pages × 100)`, `page = round(percent × pages / 100)`. A foreign or missing book is `404`;
`date` is server time. `GET` answers the latest entry per book. Deleting a book deletes its
entries (the delete dialog promises "with its progress").

**Search.** Results gain `pageCount` when Google has a positive one.

**Client.** Types follow the API; links read and write `languages` (the single picker writes one
element); `audio` gets `en`, `ru`, `uk` names and a cover mark. The format toggle keeps two
options: three overflow 320 px, and the v3 panel replaces it.

**Lost:** a year → books map. Nothing draws past goals.

## Trade-offs accepted

- `review` stays stored until a one-off cleanup; the DTO hides it.
- Book and entries are deleted in two writes, not a transaction: an orphan matches no book,
  and a recovery query exists.
- New `pages` do not recompute stored percents.
- Nothing ties `durationMinutes` to audiobooks or `pages` to print.
- The current client cannot choose audiobook until the v3 panel.

## Cost

Server: 1 model, 2 repository/service/controller trios, 2 routes, schemas, DTOs, about 45 tests.
Client: types, links, i18n keys, a cover icon. No migration, no dependency.

## Open questions

- Should a progress entry set the status to `reading`? Today the client does that separately.
