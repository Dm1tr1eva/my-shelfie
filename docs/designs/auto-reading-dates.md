# Design: reading dates set by the status

## Problem

"Read in YEAR", the month chart and the goal ring count books by `finishedAt`
(`server/services/homeStats.js`, `readBooks`), but nothing writes it: the client never sends
`finishedAt` or `startedAt` (`client/lib/books.ts:114` only types them), and the server stores
whatever arrives (`server/services/bookService.js`, `createBook`, `updateBook`). A book marked
read today counts nowhere, and "started 3 Oct" under Currently reading has no date to show.

## Out of scope

Backfilling books already marked read, client changes, a timezone parameter, dates for
`dropped`.

## Scale assumptions

One reader, a few status changes a week, one replica.

## Approach

In `bookService`, where the books feature doc says invariants belong. A book **enters** a status
when it is created with it, or when a `PATCH` sets a `status` different from the stored one.

- Entering `reading`: `startedAt` becomes today, unless the request names `startedAt` or the
  book already has one.
- Entering `read`: `finishedAt` becomes today, under the same two conditions. `startedAt` is
  left alone: today would claim the book was started and finished on one day, and nothing reads
  the start of a finished book.
- "Today" is the current UTC date at midnight, the shape a date sent as `YYYY-MM-DD` is stored
  in.
- The client always wins: a date in the request is stored as sent, `null` clears as today.
- Leaving a status never clears a date. Read → reading → read by mistake keeps the original
  finish date; clearing on the way out would turn a mis-tap into a new date.
- `PATCH { status }` equal to the stored status sets nothing, so a book marked read before this
  change does not get today's date by being saved again.

`updateBook` reads the book first when the body has a status, as it already does for the
series; one read serves both. No transaction: two simultaneous status changes of one book have
no user action behind them.

The alternative, the client sending its local date, needs every client path (add flow, panel,
"Finished") to remember it; the server rule covers them all.

## Trade-offs accepted

- **UTC day, not the reader's.** A book finished between midnight and 01:00 or 02:00 in Germany
  gets yesterday's date; on 1 January it lands in the previous year. A client that sends
  `YYYY-MM-DD` avoids it.
- **Adding an old book as read stamps today.** Creating it with `status: read`, or the add
  flow's second step setting `read`, dates it today and counts it in this year's stats, unless
  the client sends a date or `finishedAt: null`. The add flow should offer that choice.
- **Books marked read before this change stay undated** and are not counted; see Recovery.
- **A re-read keeps stored dates and can invert them.** Read → reading → read keeps the old
  `finishedAt`, counting in the first reading's year. A read book without `startedAt` gets
  today's on going back to reading, after its `finishedAt`. One pair per book.
- **`dropped` gets no date.** Nothing shows when a book was dropped.

## Recovery

Read books without a finish date, to date by hand:

```js
db.books.find({ status: "read", finishedAt: null }, { title: 1, updatedAt: 1 })
db.books.updateOne({ _id: ObjectId("…") }, { $set: { finishedAt: ISODate("2025-08-01") } })
```

`finishedAt: null` matches a missing field and a cleared one alike.

## Cost

One service function, one more read per status `PATCH`, 11 integration tests.

## Open questions

- Should the add flow ask "when did you finish it?" for a book added as read, and send
  `finishedAt: null` for "long ago"?
