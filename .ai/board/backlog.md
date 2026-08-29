---
doc_version: 2
last_updated: 2026-08-26
governed_by: [RULE-06, RULE-10]
---

# Backlog

**An ordered list, not a scored one.** A human reorders rows; the orchestrator takes the top of
READY. There is deliberately no priority algorithm, no score column, and no estimate-derived ranking.

**This is a view.** `ticket.yaml` is authoritative. On disagreement the orchestrator repairs this
file and does not touch `ticket.yaml` to make the view right.

## READY

Tickets that have been through SPEC and passed the full Definition of Ready. **READY means
specified, sized, and safe to design** — the next stage for a row here is DESIGN, not SPEC.

| # | Ticket | Title | Size | Depends on |
|---|--------|-------|------|------------|

Empty, and empty for a different reason than when this note was written. It read "both tickets that
have existed are `DONE`" when there were two; there are now five, three of them `DONE` and two in
flight past this gate. Nothing sits here because READY is a transient row — a ticket that passes DoR
is dispatched to DESIGN rather than parked. A new row still needs a feature in
`.ai/registry/features.md` first; ~~five of the ten group tables are still bare — AUT, GRP, LAY, REG and DSH~~
— struck 2026-08-26. **One table is bare: DSH.** ADR-008 gave AUT four rows and LAY one, all `TRIAGE`
or `RECOMMEND` and none of them seedable yet, which is the distinction the old sentence could not
draw: a bare table meant *nothing recorded*, and it read as *nothing wanted*.

## BACKLOG

Tickets awaiting SPEC. **Ordered.** A human reorders; the orchestrator takes the top.

Under the current gate placement a ticket sits here until it has been specified — DoR is evaluated
*after* SPEC. A row still at `BACKLOG` has not failed DoR; it has not reached it. A row showing a
later state is in flight and appears here because this file has no in-flight section.

| # | Ticket | Title | State | Blocked on |
|---|--------|-------|-------|------------|
| 1 | GRP-02 | Member assignment to groups | BACKLOG | nothing — `depends_on: [GRP-01]` is satisfied, GRP-01 merged as PR #42 |
| 2 | REG-01 | User self-release and seat request workflow | BACKLOG | 🟡 in its registry row — is self-release one feature with the request workflow, or two? Nobody has said |

**Refilled 2026-08-26. This table was empty while three seeded tickets sat at `BACKLOG`**, which made
them invisible to the one file whose job is to order them. The gap opened because `/ship` is this
file's only writer and none of the three has shipped — the rule is right and the consequence was not
foreseen: a ticket that is *seeded* and never shipped never gets a row.

**Order is a proposal, not a ranking.** There is no algorithm here by design. SYS-02 is first because
the operator said the cutover comes before new surfaces, and the argument is measurable rather than a
preference: every mock-backed feature merged before it is a feature that has to be re-verified after.
GRP-02 and REG-01 follow with nothing to separate them but REG-01's open scope question. Reorder
freely — that is what this file is for.

**SYS-02 has a conflict in the registry that this row does not resolve.** Two `TRIAGE` rows added by
ADR-008 at 09:01 propose the same work split into two tickets — one for ADR-007 clauses 1-6 and 8 with
`schema_delta: none`, one for clause 7 and the first migration. `SYS-02` was written at 10:00 as a
single ticket, per the operator's decision of 2026-08-26 that it is not to be split, **and without
searching the ledger first**, which is what `features.md` asks for in as many words. Until the two
`TRIAGE` rows are marked `OUTDATED` pointing here, the registry holds two contradictory proposals for
one piece of work.

## What is not in this table, and should not be

Eight registry rows carry `TRIAGE` or `RECOMMEND` and none appears above. That is correct: they have
no ID and no ticket, so there is nothing to order. ADR-008's rule is that an ID is what makes a
feature citable, and a proposal nobody has agreed to must not hold one.

Reading the ledger and this file together is how the board is complete:

| Where | Holds |
|---|---|
| `features.md`, `TRIAGE` / `RECOMMEND` | proposed or noticed, nobody has committed to it |
| this table | agreed, seeded, waiting for SPEC |
| `## READY` | transient — a ticket that passes DoR is dispatched, not parked |
| `## ARCHIVE` | merged |

## Deseeded — absorbed into the feature ledger, 2026-08-26

**This section is closed. Its four rows are now `TRIAGE` rows in `.ai/registry/features.md`.** ADR-008
made that file the single register for every feature the project knows about, issued or not, and this
table was one of the three fragments it replaced.

**It had already drifted, which is the argument for closing it rather than maintaining it.** The row
reading *"User self-release — waiting on a row in the REG table"* stayed after `REG-01` was seeded on
2026-08-25: the row it was waiting for existed and the table tracking its absence never learned.
Nothing detected that, because nothing read this table. A board-plane list of what the registry is
missing is a second source of truth about the registry, and it can only ever be as fresh as the last
person who remembered it.

**What was true here and is worth keeping** is why the rows were written by title and group rather
than by ID: writing IDs that do not exist recreates five standing D1 errors, and *"an audit that is
red for the length of a ticket run stops being read."* That reasoning survives the move intact — a
`TRIAGE` row in the ledger carries **no ID**, for the same reason, now enforced by check D14 rather
than by a convention in this paragraph. The rest of that argument was proven correct twice over on
2026-08-25, when `verify` turned out to have been red on `main` for three runs with `pnpm verify`
skipped entirely underneath it (MD-38, MD-40).

**To promote one:** give it an ID and a status of `PLANNED` in the ledger. An agent may type that
change (MD-24); the operator decides it by merging. Then re-seed the ticket from
`.ai/templates/ticket.yaml` with `feature_ids` populated.

## BLOCKED

Tickets halted on something outside the loop: an unapproved ADR, an escalation, a missing decision.

| # | Ticket | Blocked on | Since |
|---|--------|------------|-------|

Empty. The R8 / INV-11 escalation that sat here from `2026-08-12T16:56:20Z` was resolved by a human
and verified by execution at the second REVIEW. This row was carried stale for nine days because the
board was not repaired when the escalation ended — the record of what actually happened is in
`metrics.md` and `04-review.md`.

## ARCHIVE (last 20)

Most recent first. Older rows are dropped, not moved elsewhere — the ticket folders and Git are the
record (RULE-10).

| Ticket | Done at | PR | Rework cycles |
|--------|---------|----|---------------|
| SYS-02 | 2026-08-29T03:34:48Z | *pending — opened at ship; recorded in a follow-up commit* | 0 |
| GRP-02 | 2026-08-26T07:18:01Z | *see the note below* | 0 |
| GRP-01 | 2026-08-26T02:06:22Z | *see the note below* | 0 |
| SYS-01 | 2026-08-25T03:14:52Z | *pending — opened at ship; see the note below* | 0 |
| SEA-01 | 2026-08-25T01:52:41Z | *pending — `gh` unauthenticated; a prefilled compare URL was handed to the operator at ship time* | 0 |
| MEM-01 | 2026-08-24T09:21:52Z | *pending — `gh` unauthenticated; a prefilled compare URL was handed to the operator at ship time* | 0 |
| DEV-01 | 2026-08-23T08:35:53Z | *pending — see the note below* | 0 |
| ROO-01 | 2026-08-23T05:29:36Z | [#1](https://github.com/didi-code0980/seatseat-aifw/pull/1) — merged 2026-08-23 | 0 |

**GRP-02 shipped the same day GRP-01 did, and it is the first ticket to run the whole loop inside one
working day with nothing routed back.** SPEC 03:07Z, DESIGN 03:28Z, IN_PROGRESS, REVIEW 04:28Z, QA
06:43Z, ship 07:18Z. `rework_count: 0`, no escalation, and `size: M` matched `size_estimate: M` so
nothing routed back to SPEC for a re-estimate.

**It is also the first ticket to map every acceptance criterion through a single suite.**
`tests/unit/member-groups.test.ts` is an enumerated `allowed_path` and QA left it empty — declared at
`06-test-report.md:155` and raised as F-1 in `99-questions.md` *before* the gate, not discovered after
it. The reason is structural rather than lazy: design section 6 is a `data-testid` contract that names
no seam call, so a unit test has no function to target under RULE-05. All 11 ACs are covered by 14 e2e
tests. `allowed_paths` is a ceiling and not a quota, so the Definition of Done holds — but GRP-01
mapped each of its 17 ACs through both a unit and an e2e test, and this one does not. Whether that is
a design gap or an acceptable shape for a pure-UI slice is worth deciding before it becomes the
pattern.

**MD-35 was checked by execution again and was inert again — two ships running.**
`git diff feat/GRP-02...origin/main -- src tests package.json pnpm-lock.yaml prisma
playwright.config.ts vitest.config.ts` is empty against a base seven commits behind. `pnpm verify`
exit 0 and `pnpm test:e2e` 96/96 exit 0, both re-run on the branch at ship, and the 96 matches
`06-test-report.md` exactly. The control still does not exist; this is the fourth ship to do it by
hand.

**Its `metrics.md` history was stranded on an unpushed local branch and this ship recovered it.**
`/spec` wrote GRP-02's SPEC row — `.claude/commands/spec.md:87` instructs it to — and someone moved it
onto `ops/metrics-ledger-append`, which was committed, never pushed and never opened as a pull
request. `main` carried no GRP-02 row at all. That row is folded into this ship's commit, where it
merges with the ticket instead of waiting behind a branch nobody could see. **The contradiction that
produced it is still open**: `session-model.md:303` says *"One writer: `/ship`. Not one lane — one
command"*, and `spec.md:87` tells the BA to write the same file. Neither cites the other.

**`src/lib/data/prisma/members.ts` is written into a directory ADR-007 deletes**, exactly as GRP-01
wrote `prisma/groups.ts`. The difference is that the cutover now has an owner: SYS-02 is issued,
seeded, and inherits both.

**GRP-01 is the first ticket whose stale base cost nothing, and it was checked rather than
assumed.** The branch shipped seven commits behind `main`, and
`git diff feat/GRP-01...main -- src tests package.json pnpm-lock.yaml prisma playwright.config.ts
vitest.config.ts` is empty — all seven touch `.ai/**`, `.claude/**`, `scripts/**` and `CLAUDE.md`.
The QA gate's base therefore differs from `main` in no file either suite executes, so
`06-test-report.md`'s 126 unit and 82 e2e still describe the tree that will merge. `pnpm verify` and
`pnpm test:e2e` were both re-run on the branch at ship and returned exit 0 with the same 82 e2e —
MD-35's second half is still unfixed, and this is the third ship in a row to handle it by hand.

**It also carries a file that ADR-007 deletes, and that is recorded rather than repaired.**
`src/lib/data/prisma/groups.ts` is in `allowed_paths` and holds four `notWired` bodies. ADR-007 was
accepted 2026-08-25 — *after* this ticket's DESIGN gate — and replaces `src/lib/data/prisma/**` with a
`supabase/` sibling, module for module. Nothing here is wrong: the cutover ticket has never been
issued, so the adapter this ticket writes is still the one in the tree. The cutover inherits four more
`notWired` bodies than it would have.

**Its `metrics.md` history is one row, not six, and the gap is the orchestrator's absence rather than
the ticket's.** SPEC, DESIGN, IN_PROGRESS, REVIEW and QA all ran by direct operator invocation, and
`metrics.md` is appended by `orchestrator` on every transition — which never ran. The five gate
timestamps survive in the artifacts' front-matter and in `ticket.yaml`; backfilling them is a decision
for a human, because a row appended by a command that did not witness the transition is a different
kind of record from one that did.

**SYS-01 shipped on the first attempt, and it is the first ticket to replace infrastructure rather
than add a screen.** Better Auth is gone from the dependency tree; `@supabase/ssr` is constructed
server-side only, exempted in `no-restricted-imports` for `src/lib/auth/**` alone. `schema_delta`
held at `none` the whole way, which is what let it run the loop without stopping mid-stage for a
RULE-09 signature.

**Its QA gate was measured 56 commits behind `main` — the widest stale base yet, and MD-35(a)'s second
occurrence out of two opportunities.** `06-test-report.md:23` records 76 unit and 42 e2e against a tree
carrying neither `members.spec.ts` nor `seats.spec.ts`, and still reading `fullyParallel: true`, so it
never saw the `workers: 1` fix that made the suite deterministic. Merging `origin/main` at ship and
re-running gave **107 unit and 65 e2e, both exit 0** — this one survived its stale base where SEA-01
did not. That is luck about which files collide, not a control, and the base was wider here.

**`pnpm verify` failed at first for a reason that was not the ticket's.** `@supabase/ssr` is in
`package.json` and in the lockfile and was absent from this worktree's `node_modules`, because the
merge changed dependencies and the design lane had never installed them. Repaired with
`pnpm install --frozen-lockfile --ignore-scripts` — the MD-19 route, still safe because nothing under
`src/**` imports `@prisma/client`, verified rather than assumed. It ends the moment the schema is
approved.

**MD-36 recurred** (renumbered from MD-30 on 2026-08-25 — see MD-34). `state: DONE` was written by the QA handoff commit `2202965`, not by `/ship`
step 3, and `owner` was left empty so nothing named the stage owner. Second occurrence out of two.

**SEA-01 took three `/ship` attempts, and the first two stopping is the result worth keeping.**
Attempt 1 found `feat/SEA-01` twenty-five commits behind `origin/main` — cut before MEM-01 merged, so
QA had run against a tree with neither `tests/e2e/members.spec.ts` nor `tests/unit/members.test.ts`.
`06-test-report.md:23` records `45 passed` e2e and 74 unit, which are exactly the pre-MEM-01 counts
against today's 61 and 92. The QA gate was `passed: true` and honestly measured, of a tree that no
longer existed. Merging `origin/main` at ship surfaced the real conflict immediately:
`members.spec.ts:477` (*no other member is changed in any respect*) failed because SEA-01's seat
re-assignment moved `SEAT-B-06` between members mid-assertion, `playwright.config.ts` having set
`fullyParallel: true` against one `webServer` holding the mock store in process memory. Attempt 2
stopped on the same failure and fixed it on `ops/e2e-worker-isolation` — `fullyParallel: false`,
`workers: 1` — which the operator merged. Attempt 3 merged that base in and passed 61/61.

**Both halves are MD-35** (renumbered from MD-29 on 2026-08-25 — see MD-34)**, and only one is fixed.** The worker isolation is repaired; *a gate can pass
against a base the ticket will never merge into, and nothing re-checks it at ship* is not. It was
handled by hand three times in one ship, and the next ticket cut before a merge reproduces it.
`feat/SYS-01` is that ticket.

**`state: DONE` was written by SEA-01's QA handoff commit `f37236a`, not by `/ship`.** Left as it
stands because it is now true, and recorded rather than repaired silently — a ticket that marks
itself DONE at QA claims a ship that has not happened, and on attempt 1 that claim was false while
the branch was red.

**ROO-01's PR column was wrong and is corrected here.** It read "Not opened" from the 2026-08-23
`/ship` run, when `gh` was absent and the branch had no commits. The PR was opened and merged as
**#1** shortly afterwards; `.ai/registry/features.md` recorded that and this file did not. The
registry was ahead of the board for half a day.

**MEM-01's PR is pending for the same reason DEV-01's is, and that is now three ships in a row.**
`gh auth status` still reports no logged-in host, and `gh auth login` is an interactive TUI that
cannot be driven from a loop session — authenticating is the operator's, once, outside the loop. What
is different this time is that the ship did not stop at naming the branch: `/ship` step 7 now
requires a `compare/main...feat/MEM-01` URL with the title and body percent-encoded into it, so the
operator lands on a filled form. MD-17 is the standing item.

**These board rows travel in a separate pull request from the ship, and that is a defect being
recorded rather than a choice.** `/ship` step 4 puts `backlog.md` and `metrics.md` in the ticket set
precisely so this cannot happen; step 6's `check-allowed-paths` then fails the branch on them, because
they match no `allowed_paths` entry and widening the list is forbidden. The blocked merge outranks the
ordering risk, so they moved to `ops/board-mem-01-ship`. Merge that one **after** `feat/MEM-01`, or
this file will claim a ship that has not landed. MD-20.

MEM-01 also reached DONE with `rework_count: 0` across **two** rework cycles, both opened by a QA
failure — pass 1 raised F-6 and F-7, pass 3 raised F-9 — and neither charged to the Developer, because
RULE-08 counts only Developer-caused failures and both causes were upstream in the design: F-6 was a
defect in version 1, F-9 a cache-behaviour gap version 3 declined and version 4 accepted. The record is
four passes in `04-review.md` and passes 1, 3 and 4 in `06-test-report.md`, none of them edited.

**DEV-01's PR is pending, and for a narrower reason than ROO-01's was.** `gh` is now installed
(2.98.0) but not authenticated — `gh auth status` reports no logged-in host, and OAuth cannot be
run from a non-interactive session. The commit and the push are done and the branch is real; only
`gh pr create` is outstanding. Whoever runs `gh auth login` fills in the column.
