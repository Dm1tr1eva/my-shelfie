# ADR 0001: reference data with no user data may be shared across users

**Status:** accepted, 2026-11-26

## Context

`CLAUDE.md` translates multi-tenancy as "tenant means `userId`": every repository method takes
`userId` first, and another user's record is a `404`. Every collection so far (books, series,
progress, the year goal) is the user's own data, so the rule had no exception.

Series lookup ([designs/series-lookup.md](../designs/series-lookup.md)) asks a paid model which
series a book belongs to. The answer — a series name, its books, numbers, status and the web
pages it came from — is a fact about a published book. It is the same for every reader, and
nothing in it comes from the reader's shelf. Caching it per user would pay for the same answer
once per user and keep identical copies.

## Decision

A collection may be shared by all users, and its repository may omit `userId`, when **all** of
these hold:

1. It stores only public reference data: facts about books and series that anyone could find,
   never anything a user wrote, owns or did (ratings, notes, ownership, reading status).
2. It has no `userId` field and nothing derived from one, and the request that fills it is
   built only from bibliographic input (title, authors, ISBN, Google Books id, language).
3. No endpoint lists or searches it. It is read only as the answer to a lookup the caller made
   themselves, so a caller learns nothing they did not ask about.
4. Nothing in it is ever written into a user's own records without that user's confirmation.

The first such collections are `series_lookups` and `series_lookup_books`
(`repositories/seriesLookupRepository.js`). The usage counter for the daily limit,
`series_lookup_usage`, is per user and keeps `userId` as the first parameter.

## Consequences

- One user's lookup answers the next user's lookup of the same book without a model call.
- A wrong answer — a model mistake, a misleading web page, or a crafted request — reaches other
  users too. It reaches them only as a suggestion they confirm, with its sources shown, and the
  operator deletes it with the query in [features/series-lookup.md](../features/series-lookup.md).
- A cached answer comes back faster than a fresh one, so timing can reveal that someone looked
  a book up, never who.
- The cross-tenant test rule does not apply to these collections; a test instead proves that
  nothing in them holds a user id and that a lookup writes nothing to the user's books or series.
- A new shared collection needs the four conditions above checked in its design doc, or its
  own ADR.
