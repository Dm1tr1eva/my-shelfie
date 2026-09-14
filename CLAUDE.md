# CLAUDE.md — working agreements

Rules for how work is done in this repository: what precedes code, what counts as done,
how things get reviewed and written down. Architecture lives in `<docs/README.md>`; this
file is the process.

**These rules govern new work. Where existing code disagrees, the rules win for new code;
migrate old code when you touch it, not in a rewrite.** Without that sentence every rule
here loses an argument to the first file that predates it.

---

## Applicability to this project

Added 2026-09-14. `my-shelfie` is a solo learning project at stage 4 of 10 (book CRUD on the
backend), deployed nowhere, one developer, no CI. The rules below are written for a team
product. This section records which of them are translated and which are deliberately
dormant. **Anything not listed as dormant is in force.**

Translated, not waived:

- **"tenant" means `userId`.** Every user owns their own books, so the multi-tenancy section
  applies in full: `userId` as the first parameter, `404` and never `403`, and an integration
  test per resource proving a cross-user read fails.
- The `(tenantId, createdAt)` index is `{ userId: 1, createdAt: -1 }` in Mongo. **It does not
  exist yet** — `getBooks` filters on `userId` and sorts on `createdAt` without it.
- "The database client never appears in a controller" means Mongoose models are reached
  through a repository, not imported into `controllers/`.
- `docs/ROADMAP.md` is the plan that the documentation section calls `docs/plan.md`. It keeps
  its current name.

Dormant, with the reason and what revives it:

- **Migrations** — Mongoose schemas are code and there is no migration tool. Revives if one
  is added.
- **Cross-team contracts, consumer notes, microservices** — one developer, one deployable.
  Revives when somebody else consumes this API.
- **"in CI"** on the quality gates — there is no CI. `npm run verify` still applies and must
  pass locally. Revives at stage 10 (deploy).
- **Generated API spec annotations** — no spec exists. Revives if one is added.
- **Type-aware linter ruleset** on `server/` — plain JS by an explicit stage-0 decision.
  Applies to `client/` today.
- **Review by eight lenses in separate working copies** — on request, not on every change.
- **Operator SQL runbooks** — there are no operators. Recovery notes still belong in the
  feature doc.
- **Cursor pagination** — a personal shelf is hundreds of rows and offset is honest at that
  size. Revives if a list can exceed a few thousand rows or gains live inserts.

---

## Principles

The rules further down are the "how"; these are the "why". When a rule and a principle
disagree, the principle wins and the rule gets revisited.

1. **Design before code.** A short design — problem, out of scope, scale assumptions,
   approach, trade-offs accepted, cost — precedes non-trivial work. Rewriting the same code
   three times means the first two passes were design done in the expensive medium.
2. **Defensive code needs a real-world trigger.** Before adding a lock, retry, fallback,
   circuit breaker, idempotency key or rate limit, name the concrete sequence of user actions
   that produces the scenario, and how often it has happened in *this* product. If that takes
   more than a sentence, the scenario is theoretical: record it under "Trade-offs accepted"
   and do not build it. Complexity is paid by every future reader; the author pays once.
3. **Trade-offs are explicit decisions, not omissions.** "We do not handle X because Y" is a
   complete design output; "we forgot X" is not. A design or feature doc without a
   "Trade-offs accepted" section is incomplete even when every behaviour is correct, because
   every future review re-litigates the same scenarios.
4. **Match the defence to the actual threat model.** Write the current deployment down in one
   paragraph — replicas, users, who can reach what — and scope defences to it. Then name the
   one failure the product cannot survive (a cross-tenant leak, a lost payment, a corrupted
   export) and exempt it from the scoping. When the deployment changes, that paragraph is the
   first thing to revisit.
5. **An operator runbook beats automation for rare edges.** Orphan rows, stuck statuses and
   one-off cleanups that fire less than monthly are handled by SQL an operator runs,
   documented under "Recovery" in the feature doc — not by reconciliation jobs.
6. **Reuse what exists first.** Database constraints, the validation layer, the existing
   queues and primitives come before a new table, a new cache prefix or a new service. One
   sentence on why the existing thing does not cover the case; if the sentence is fuzzy, the
   new thing is not justified.
7. **Throw, don't catch, for single-step operations.** One HTTP call, one DB write, one cache
   op: let it propagate to the central error handler. Catch-and-recover is for multi-step
   orchestrations where partial success leaves inconsistency. Every exception to this is
   named and documented at the boundary where it applies.

---

## Starting a session

- Read the docs index, then the plan (what is done, what is next), then the feature doc and
  ADRs for the area you are about to change, then `git log --oneline -20 -- <path>`.
  The docs are the context that survives between sessions; the code alone does not explain
  itself.
- **Do not rely on memory of a previous session for how something works.** Re-read the doc.
- When code and a doc disagree, the doc is stale: fix it in the same PR and bump its
  "Last verified against code" date.

---

## Design

Non-trivial work starts with `docs/designs/<slug>.md`, **at most 600 words**, in this shape:

```
# Design: <what>

## Problem            — what breaks today, with file:line evidence
## Out of scope       — the list that stops the design growing in review
## Scale assumptions  — how many, how often, how many replicas
## Approach           — the decision, and why the alternative lost
## Trade-offs accepted — what we knowingly do not handle, and why that is survivable
## Cost               — new files, migrations, dependencies, rough diff size
## Open questions     — what would change the design if answered differently
```

The word limit is the point, not a formality: 600 words forces the author to decide instead
of enumerating options. Check it (`wc -w`) rather than eyeballing it.

Two passes, ideally by two different reviewers (or two agents):
- one that finds what is **missing** — unhandled cases, failure modes, ambiguity;
- one that finds what to **cut** — speculative generality, abstractions with one
  implementation, defences with no real trigger.

A design doc is a proposal, not scripture. If a reviewer says "cut this" and the rules say
otherwise, the rules win — and the disagreement gets written down in the doc, not silently
resolved.

---

## Shape

- One module per bounded context. No microservices until there is a deployment reason.
- **Three layers inside a module, no more:** controller/handler (transport, DTOs) → service
  (use case, invariants) → repository (database). The database client never appears in a
  controller or a background worker.
- **Interfaces only at seams.** Add an abstraction when a second implementation is planned
  within the next iteration, or the code cannot be tested without one — never speculatively.
  No ports-and-adapters everywhere, no CQRS, no event sourcing "for later".
- Modularity is enforced by **import direction**, not folder names:
  - infrastructure modules (`config`, `db`, `auth`, `crypto`, `queue`) may be imported by
    anyone. A module becomes infrastructure by decision, never by accumulating two callers.
  - a feature module is consumed **through its services, never its repositories**. A caller
    that reaches a repository has skipped the rules the owning service enforces.
  - feature-to-feature imports beyond a written list need their own argument in an ADR, and
    run one way.
  - enforce it with a linter rule (`import/no-restricted-paths` or equivalent). Until the
    rule exists, a review lens checks it — but a rule in CI beats a rule in a review.

---

## API and data

- Explicit response DTOs; **never return a database model**. Secrets and tokens must have no
  path to the wire.
- Validate every request body at the boundary with a strict allow-list — unknown fields are
  rejected, not ignored. JSON columns are validated against a schema on every write.
- Cursor pagination for time-ordered lists. No offset.
- A generated API spec is the contract's *syntax*; a prose contract doc carries the semantics
  a spec cannot (what "absent" means, what replaces what, which combinations are illegal).
  Both, or the frontend guesses.
- Multi-row invariants go in a transaction. Index anything listed per tenant on
  `(tenantId, createdAt)`.
- **Migrations are immutable once applied anywhere but your own machine** — staging,
  production, a teammate's clone after a push. Write a new one. A local, unpushed latest
  migration can be dropped and regenerated freely.

---

## Multi-tenancy

Skip this section only if the product genuinely has one tenant.

- `tenantId` is a **required first parameter of every repository method** — never optional,
  never defaulted. An optional tenant filter is a leak waiting for a careless caller.
- A resource in another tenant is **`404`, not `403`**: do not reveal existence.
- Every new tenant-scoped resource gets an integration test proving a cross-tenant read fails.

---

## Quality gates

- Linter (type-aware ruleset), formatter, type check, and tests — all in CI.
- **One command**, `npm run verify`, runs exactly what CI runs. Two lists drift; when they
  drift, CI is red for reasons nobody can reproduce locally.
- Add `.gitattributes` with `* text=auto eol=lf` on any repo with Windows contributors.
  Without it the formatter check passes for the author and fails on a fresh clone.
- A formatting-only commit goes in `.git-blame-ignore-revs` so it does not bury `git blame`.

---

## Tests

- **Tests are mandatory and they test behaviour, not implementation.** Drive the public
  surface (an HTTP call, a service method) and assert on what a caller can observe.
- Asserting that a mock was called is right only when **that call is the contract**. "The
  reply was handed to the channel adapter" is a contract; "the repository was queried twice"
  is not.
- **A bug fix starts with a test that fails for the bug.**
- Test names describe behaviour in plain language: `skips the reply when the 24h window has
  closed`, not `test window`.
- Pick the level by what it can prove: pure logic → unit; services → mocked repositories;
  anything only a database can prove (unique keys, soft-delete revival, transactions) →
  integration tests against a real database.
- **No tests for the sake of coverage, no snapshot tests of DTOs, no coverage targets.**
  A test that would keep passing after the feature was deleted is not a test.
- **Verify a test by breaking the thing it covers.** Revert the fix, or flip the condition,
  and watch it go red. A test nobody has seen fail is a guess. This catches the common
  false-positive shape: an assertion that is satisfied by the wrong output too.
- Realistic data lives in `fixtures/`; prefer a fixture over an inline blob when the shape
  matters. A fixture is also seed data — changing it can break whatever consumes it.

---

## Review

Review by lenses, not by "take a look". One pass looking for everything finds the first
thing. Each lens is a separate reviewer with one question:

| Lens | Asks |
|---|---|
| plan-conformance | Does the code do what the design said, and are the deviations documented? |
| correctness | Races, error handling, null paths, async sequencing, swallowed errors |
| tests | Missing cases, tests of mocks, assertions that cannot fail |
| security | Secret leakage, authz bypass, injection, unsafe defaults |
| boundaries | Dependency direction, layer skips, leaky abstractions |
| over-engineering | Dead code, unused parameters, abstractions with one caller |
| duplication | Copy-paste, repeated magic values |
| observability | Event naming, missing correlation ids, PII in logs |

Rules that make the output usable:

- **Every finding shows its evidence** — a grep, a run, a diff, a `file:line`. A finding
  without evidence is a guess and is not reported.
- **Every lens also lists what it checked and found clean.** Otherwise you cannot tell
  "nothing wrong" from "did not look".
- Run lenses in **separate working copies**. Two reviewers editing one tree see each other's
  changes and report each other's work.
- Severity is about consequence, not taste. "This would 400 every request" outranks "this
  name could be better", and taste-level notes are dropped, not listed.
- The author answers each finding with fix / won't-fix-because / already-covered. A finding
  left unanswered comes back in the next review.

---

## Documentation

```
docs/
├── README.md                  the index — a session starts here; a new doc is added to it
├── plan.md                    status per item and the recommended order
├── designs/<slug>.md          written before non-trivial work, ≤600 words
├── features/<name>.md         one per feature; TEMPLATE.md defines the shape
├── adr/NNNN-<slug>.md         one decision per file: context, decision, consequences
└── <name>-contract.md         prose contracts shared with another team
```

- **Everything written down is written in English** — docs, code comments, commit subjects,
  test names, error messages. Chat with the author happens in whatever language suits; the
  artefacts do not follow it. A repository that mixes two languages forces every reader to
  hold both.
- **Every feature has one doc**: what it does, the invariants, the endpoints and events, the
  data it owns, the trade-offs accepted, links to its ADRs. Updated in the same PR as the
  code, or the PR is not done.
- Every feature doc carries a **"Last verified against code"** date. It is the only honest
  way to read a doc: not "is this true" but "how old is this claim".
- **ADRs are short and never deleted.** A superseded ADR is marked superseded — the reasoning
  that was wrong is the most useful thing in the folder.
- **The README is a runbook** (how to bring the system up) and stays that way. It does not
  accumulate feature descriptions.
- When a task changes the status of a plan item, update the plan **in the same PR**.

---

## Comments

- Comments explain **why**, never **what**. A comment that restates the line below it is
  deleted.
- Decisions get recorded (why this flag on the connection string, why the lock file is built
  in Docker); narration does not.
- No commented-out code. No `TODO` without an ADR or issue reference — an unreferenced TODO
  is a wish, and it will outlive everyone who understood it.

---

## Scope and ownership

- **Do the task, not the neighbourhood.** Something worth fixing outside the task gets
  flagged — a line in the PR, a ticket — not fixed in passing.
- **No refactoring "while here".** A refactor is its own PR with its own reason.
- When an API change affects another team, the deliverable is the spec annotation, the
  contract doc, **and a note saying what changed for the consumer** — in their words, not a
  diff link. A cross-team change is not done when it compiles; it is done when the other side
  knows what to do.

---

## Commits and PRs

- Conventional Commits scoped by project — `feat(server):`, `fix(web):`, `docs(deploy):` —
  with a subject that reads as prose, not as a file list.
- **One concern per PR.** Small enough to review in one sitting. A plan rewrite and a data
  contract change are two PRs even when one produced the other.
- Adding a dependency needs a sentence in the PR saying why the standard library or the
  framework is not enough.
- **No `Co-Authored-By` trailer for AI assistants, ever.** A commit is authored by the person
  who ran the session, and by nobody else.

---

## Definition of done

A change is done when all of these hold, **in the same PR**:

1. Code, following the rules above.
2. Tests that prove the behaviour, passing locally — including the integration suite when a
   database is involved.
3. The feature doc created or updated; an ADR if a decision was made.
4. Migration committed if the schema changed; env example, config schema, validation and the
   deploy doc updated if configuration changed.
5. API spec annotations on any new or changed endpoint.
6. The plan item's status updated.
7. **Results reported as they are.** If a test fails, say so with the output. If a step was
   skipped, say that. A green report that hides a skipped step costs more than a red one.
