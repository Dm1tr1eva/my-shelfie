# Feature: <name>

**Last verified against code:** <YYYY-MM-DD>

That date is not decoration. It answers "how old is this claim", not "is this true". Update it
in the same PR as the code.

## What it does

One paragraph: which user problem it solves.

## Invariants

What is always true, whatever order things are called in. For example: a book always belongs to
exactly one user; `finishedAt` is never earlier than `startedAt`.

## Endpoints

| Method and path | Who may call it | Answers |
|---|---|---|
| | | |

For each one: the error codes and what they mean. Separately: what "field absent" means as
opposed to "field is null".

## Data

Which collections the feature owns, which fields, which indexes and why they exist.

## Trade-offs accepted

What is knowingly not supported, and why that is survivable. This section is mandatory: without
it every later review re-litigates the same scenarios. "We do not handle X because Y" is a
finished output; "we forgot X" is not.

## Recovery

What the operator — here, the project owner — does when the data has drifted: the queries that
fix orphaned records and stuck statuses. Rare repairs live here rather than in automated jobs.

## ADRs

Links to `../adr/NNNN-*.md` for decisions about this feature.
