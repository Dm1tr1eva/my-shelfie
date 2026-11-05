# Design: mark a series that is not finished but can be read now

## Problem

A series is `ongoing`, `complete` or `unknown` (`server/constants/library.js`). The author reads
unfinished series too, but only when the books out so far end in a satisfying place, so that
nobody has to wait for the sequel with a cliffhanger. The two ongoing kinds look the same
today: a series with a cliffhanger and one that can be enjoyed now.

## Out of scope

- Per-book "has an ending" flags, ratings of the ending, or a count of books that are readable.
- Changing what "Next to buy" does for such series.

## Scale assumptions

One more value of an existing field; a few series per user.

## Approach

A fourth series state, `readable`: "still coming out, but the books out so far can be read as
they are". It is a value of `status`, not a new flag, because everything that handles a state
already handles one more value: the Zod schemas, the Series model enum, the state pills when you
create or edit a series, the chip next to the title, the series-status filter on every list
and the server filter of Next to buy. Nothing else needs to know.

- **Pills** ("Is the series finished?"): Still coming out, **Still coming out, but readable
  now**, Finished, Don't know.
- **Chip and filter label:** "Readable now", in green so it stands apart from the navy
  "Ongoing". The series page header reads "Ongoing series, readable now".
- **Existing data:** unchanged. A series becomes readable only when the author says so.

**Alternative that lost:** a boolean `readableNow` that is only meaningful while the state is
`ongoing`. It allows an impossible pair (finished and "readable") that every reader of the code
would have to rule out, and the filter would need a new parameter.

## Trade-offs accepted

- A series cannot be "ongoing" and "readable" at once in a filter: choosing the filter value
  Ongoing does not include Readable now. Both can be picked together (values within a group are
  OR).
- When the series is finished, the author changes the state by hand; nothing infers it.

## Cost

Server: one value in the enum, one test. Client: a label, a pill, a chip colour, a header
line, tests. About 60 changed lines, no migration.

## Open questions

- Whether the number of readable books matters ("the first three are fine"). The series note
  already holds free text, so use it first.
