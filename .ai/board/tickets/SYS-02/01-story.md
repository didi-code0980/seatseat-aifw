---
ticket: SYS-02
stage: SPEC
agent: ba
produced_at: 2026-08-26T08:03:28Z
amended_at: 2026-08-27T07:56:34Z   # third run. 2026-08-26T08:33:56Z was the second; both are in the changelog.
inputs_read: [ .ai/board/tickets/SYS-02/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/registry/decisions/ADR-007-supabase-as-the-data-client.md, .ai/01-operating-model.md, .ai/standards/rbac-and-security.md, .ai/standards/testing-standards.md, .ai/standards/integrations.md, .ai/board/model-debt.md, .ai/templates/story.md, .ai/board/tickets/SYS-02/06-test-report.md, .ai/board/tickets/SYS-02/99-questions.md, .ai/board/tickets/SYS-02/02-design.md, "branch: feat/SYS-02 at f32e10e, third run" ]
consulted:
  - with: none
    asked: "Nothing. No pair was consulted and no chat was opened."
    answer: "n/a"
    resulted_in_amendment: false
  - with: operator
    asked: "Q-1 — `size_estimate` has no value this ticket can truthfully take. Three exits offered: (a) give the field an L value, (b) read the field as the story's scope rather than the implementation's footprint and set M, (c) accept that SYS-02 escalates and never passes DoR. This story recommended (a)."
    answer: "`/spec SYS-02` reissued unchanged after the BLOCKED verdict. Read under the standing instruction in `.ai/steward/context.md` — 'Disagree once, then comply fully. An instruction repeated is a decision made.' — as the decision that SPEC passes. Exit (b) is taken: it is the only one of the three this stage can execute, because (a) amends `.ai/01-operating-model.md` under RULE-01 and (c) is the verdict already given and refused."
    resulted_in_amendment: true
  - with: qa
    asked: "`99-questions.md`, qa -> ba, 2026-08-27T03:52:46Z, restated as the failure in `06-test-report.md`: `Q-2` is open, and it is what makes AC-1 unmapped and the second halves of AC-9, AC-11 and AC-12 unexecutable. Which database does a non-production run reach? Three answers named as legitimate: a second Supabase project, a local CLI stack, or these four accepted as verified only in CI or by hand."
    answer: "The second of the three, and it needs nothing provisioned. `ADR-007` OQ-2 — registry plane, ACCEPTED — already decides that the types are generated from `supabase db reset` against `supabase/migrations/` on the CLI's own local stack, and states that CI needs no cloud credential for it. That stack is a migrated, emptiable database that is not the live project, and it is the environment those criteria were missing. `Q-2` carries the decision; five Givens now name it — AC-1, AC-9, AC-10, AC-11 and AC-12, the fifth because AC-10's own `Given` said *an empty database* and named none either."
    resulted_in_amendment: true
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DESIGN
---

# SYS-02 — Cutover to Supabase as the data client

**This story passed on its second run, and the first run's verdict is kept rather than erased.** It
was written complete and gated `BLOCKED` on one field — `size_estimate`, which `Q-1` shows can take no
value that is true of this ticket. The operator reissued `/spec SYS-02` unchanged, which under the
standing instruction *an instruction repeated is a decision made* is the decision that SPEC passes.

**`size_estimate` is now `M`, by `Q-1`'s exit (b), and the number is weaker than it looks.** Exit (b)
reads the field as what its own definition says — *from the story's scope and its Out-of-scope
section* — and on scope this ticket is one thing: swap the implementation behind a seam whose contract
does not change. It adds no capability, changes no DTO, and touches no screen. On **footprint** it is
neither `S` nor `M` and nothing below pretends otherwise; `Q-1` stays open and routed to the steward,
because the reason the field could not hold the truth is a defect in the model and reissuing a command
did not repair it. What DESIGN is owed, in one line, is under *Size*.

**Third run, 2026-08-27, on the `R6` route out of the QA gate.** `06-test-report.md` returned
`gate: FAIL`, `routed_to: ba`, `increments_rework_count: false` on one row: **AC-1 mapped to no named
test**, and AC-9, AC-11 and AC-12 were recorded PARTIAL for the same single reason — none of them
named a database they could be observed against, and the only project that exists is the live one.
The failure is this story's, not the implementation's; both suites are green and no behaviour is
wrong. What this run changes is the *Given* of five criteria and the status of `Q-2`. **No criterion
was weakened to clear the row, and the cheap substitution `06-test-report.md` names and refuses —
giving AC-1's ID to a test of its first clause alone — is not made here either.**

Every acceptance criterion derives from `.ai/registry/features.md:152`, `ADR-007`, its five answered
open questions, its *Implementation decisions, 2026-08-26*, and the standards named in `inputs_read`.
No criterion originates in a tracker description (RULE-17) or in `src/**` (RULE-05, never read). The
facts this story states about the current tree are quoted from `ADR-007` §Context, which read them
from files on a named commit, rather than read by this stage.

## Feature

Transcribed from `.ai/registry/features.md:152` without paraphrase:

| ID | Status | Title | Description | Group | Invariants touched |
|----|--------|-------|-------------|-------|--------------------|
| SYS-02 | PLANNED | Cutover to Supabase as the data client | The application reads and writes a real Postgres database through Supabase instead of in-memory fixtures. Prisma leaves the project; `src/lib/data/prisma/` is replaced module-for-module by a `supabase/` sibling under `src/lib/data/`, against the same DTOs, and `DATA_SOURCE` defaults to the real database. | SYS | INV-04, INV-05, INV-06 |

The row's `Invariants touched` column is the seed for `ticket.yaml`, not the answer. This stage
determines the real set and **extends** it; the grounds are in *Invariants touched* below, and the
extension is the most consequential thing this story does.

## User value

Every feature shipped so far — `ROO-01`, `DEV-01`, `MEM-01`, `SEA-01`, `GRP-01` — runs on in-memory
fixtures that are recreated on every process start. Nothing anyone does in the application survives
a restart, which means the system currently cannot be used for the thing it exists for: recording
where people sit, what they own, and which port they are patched into. That is not a missing feature;
it is the absence of persistence underneath every feature.

This ticket makes the data real. Its value does not accrue to a role — no screen changes, no
capability appears, and a user who signs in afterwards sees exactly what they saw before. What
changes is that what they see is still there tomorrow. **The whole of the observable value is
therefore in the refusals and the invariants**: a real database can reject data the fixtures happily
held, and `AC-8` through `AC-11` are where that becomes visible.

## Acceptance criteria

**A cutover is mostly invisible, so most of these are written against things that can be observed
without a screen** — a rendered indicator, a package that is absent, a command that exits non-zero, a
write the database refuses. An AC that could only be confirmed by reading the diff is not an AC and
none is written here.

### The environment each criterion is observed in

**Added on the third run, 2026-08-27, answering `Q-2`. It is the whole of what this run changes.**

Five clauses can only be observed against a database that has been migrated and can be emptied:
AC-1 entirely, AC-10, AC-11, AC-12, and the regeneration half of AC-9. Until now none of them named
one, and the only database in existence is the live project — so QA wrote no test for AC-1 at all and
marked the other three PARTIAL.

**They now name one, and it is not the live project.** It is the Supabase CLI's own local stack:
`supabase db reset` against `supabase/migrations/`. This is not a new instrument and this stage did
not choose it. `ADR-007` OQ-2 — registry plane, `ACCEPTED` — already decides that the committed types
are produced *"by `supabase db reset` against `supabase/migrations/` followed by `supabase gen types
typescript --local`"*, and states in the same answer that **CI needs no cloud credential**. A stack
with those two properties is a migrated, emptiable database that is not the product's. That is
exactly what these five clauses were missing.

**The substance of no criterion changed.** Only the *Given* of each says where it is observed. AC-1
still asserts that a row written through the application survives a process restart. The exchange
`06-test-report.md` declined to make — give AC-1's ID to a test of *"runs against the real database by
default"* alone and let the coverage map read complete while both substantive clauses stay unverified
— is declined here too, and would have been the easier amendment to write.

**One constraint on DESIGN, stated here because it is what makes the QA gate satisfiable rather than
merely satisfied.** The stack needs a container runtime, and the machine this loop runs on has none —
`which supabase` and `docker info` both came back empty when QA checked. So these tests must not sit
inside `pnpm test`. The QA gate is *"`pnpm test` and `pnpm test:e2e` exit 0"*, and a unit suite that
turns red wherever Docker is absent fails that gate on the absence of a container runtime rather than
on the product. They belong behind their own command, green in CI, and reporting **skipped, no local
stack** rather than **failed** where the stack is not up. Which file, which script and which job step
is DESIGN's to fix; that the five clauses must be executable somewhere, and must not make the unit
suite red anywhere, is this stage's.

**What this costs, so QA does not discover it.** On the loop's own machine these five clauses will be
reported *not executed here*, with CI as the evidence. That is weaker than a test QA watched pass, and
it is the honest ceiling of a decision that provisions nothing. `Q-2` names the two alternatives that
would lift it and what each would cost.

**AC-1 — The application runs against the real database by default**
- Given the CLI's local stack up and migrated, its URL and key in the environment, and no
  `DATA_SOURCE` set
- When the application starts and a page reading any seam function is opened
- Then the data shown comes from the Postgres database, not from in-memory fixtures
- And a row created through the application is still present after the process is restarted

**AC-2 — Mock mode still runs with no network at all**
- Given `DATA_SOURCE=mock` and no database reachable
- When the unit suite runs
- Then it passes
- And no test in it opens a network connection

**AC-3 — The rendered data-source indicator names the adapter in use**
- Given the application running in either mode
- When the home page is opened
- Then `data-testid="home-data-source"` shows the active adapter's name
- And the value is one of exactly two: `mock` or `supabase`

**AC-4 — Prisma is gone from the project**
- Given the repository after this ticket
- When `package.json`, the scripts, and the directory listing are inspected
- Then neither `prisma` nor `@prisma/client` is a dependency
- And `prisma/`, `src/lib/data/prisma/`, `prisma.config.ts` and the `db:push` and `db:studio` scripts
  are absent
- And no file under `src/` imports either package

**AC-5 — Callers of the seam did not change**
- Given every component, server action and page that reads or writes data today
- When this ticket is complete
- Then none of them changed to accommodate the new adapter
- And `src/lib/data/types.ts` exposes the same DTOs it exposed before

**AC-6 — Each Supabase package stays inside its own directory**
- Given the two packages, `@supabase/ssr` for auth and `@supabase/supabase-js` for data
- When the documentation audit and the lint run
- Then an import of either package from outside its own exempted directory is an error
- And an exemption naming the auth package for a `lib/data` path is an error
- And both checks pass on the tree this ticket produces

**AC-7 — No Supabase client or key reaches the browser**
- Given the built application
- When any file marked `"use client"` and every `NEXT_PUBLIC_*` name is inspected
- Then no `@supabase/*` import appears in a client file
- And no Supabase key is exposed under a `NEXT_PUBLIC_*` name

**AC-8 — Type-checking needs nothing but the repository**
- Given a checkout with no database reachable and no Supabase credentials
- When `pnpm typecheck` runs
- Then it exits 0
- And the generated table types are read from a committed file rather than fetched

**AC-9 — The committed types cannot drift from the migrations**
- Given the committed generated types, the migrations directory, and the CLI's local stack
- When types are regenerated from a local reset of those migrations and compared
- Then the comparison is identical
- And a regeneration that differs fails the run rather than rewriting the file silently

**AC-10 — The first migration carries the three invariant constraints**
- Given the first migration applied to the CLI's local stack by `supabase db reset`
- When the schema is inspected
- Then INV-04 is held by a partial unique index, INV-05 by a constraint trigger on the device table,
  and INV-06 by a downgrade trigger on the seat table
- And no `status` column exists on the seat table (INV-03)

**AC-11 — The database refuses data the invariants forbid**
- Given the CLI's local stack with the first migration applied
- When a write is attempted that would give one seat two occupants, one seat two primary devices, or
  a primary device an owner who is not that seat's occupant
- Then the database rejects the write, not only the application
- And when an occupant is removed from a seat, that seat's primary device is no longer primary

**AC-12 — The seed produces the same data the fixtures describe, and can be run twice**
- Given the CLI's local stack reset to the first migration and holding no rows
- When the seed is run
- Then the application renders the same rooms, seats, members and devices that `DATA_SOURCE=mock`
  renders
- And running the seed a second time changes nothing and fails nothing

**AC-13 — The seed refuses to run against production**
- Given `NODE_ENV=production`
- When the seed is invoked
- Then it refuses and exits non-zero
- And it writes nothing

## Invariants touched

**This stage extends the list from three IDs to ten, and the extension is deliberate.**
`ticket.yaml`'s header states that the BA *"owes per-ID reasoning at SPEC and is expected to NARROW
this list, not extend it."* That expectation is not met and the reason is a single sentence:
**this is the ticket that authors the first migration, and a migration is the artefact in which every
structural invariant is either expressed or silently omitted.** The three IDs the feature row carries
are the three that get a *named instrument* in ADR-007 §OQ-5. They are not the three the change could
affect.

`.ai/registry/invariants.md` is explicit that this is the test to apply — the list records what the
change **could** affect, indirect chains are followed, and *"choosing the safest behaviour and then
concluding no invariant is engaged is circular reasoning: the fact that the behaviour had to be
chosen is the evidence that the invariant was in play."* Every ID below was in play while the
migration was being written, whether or not it ends up with a constraint.

| ID | How this ticket could affect it |
|----|-------------------------------|
| INV-01 | A seat has at most one occupant. The migration decides whether occupancy is a single-valued column or a table that permits two rows. Held structurally or not at all. |
| INV-02 | One person may occupy multiple seats. Held by the **absence** of a unique constraint on the occupant reference — an absence is exactly what a first migration adds by accident, and nothing downstream would notice until a second seat was refused. |
| INV-03 | Seat status is derived, never stored. The invariant's own note names the two things this ticket does: *"no migration may add a `status` column to the seat table, and no seed may write one."* AC-10 and AC-12 are the criteria. |
| INV-04 | A seat has at most one primary device. Partial unique index, ADR-007 §OQ-5. On the feature row. |
| INV-05 | A primary device belongs to the seat's occupant. `DEFERRABLE INITIALLY IMMEDIATE` constraint trigger on the device table. On the feature row. |
| INV-06 | Exit downgrades the primary device. Trigger on the seat table, closing the side a device-only trigger leaves open. On the feature row. |
| INV-07 | Devices may exist unassigned. Held by the owner reference being nullable. A first migration that makes it `NOT NULL` — the tidier-looking choice — makes an entire documented state unreachable. |
| INV-08 | There is no self-signup. This ticket introduces the first code that creates `auth.users` rows, through the admin API with the service-role key. That is not self-signup and this story does not claim it is; it is listed because a script that mints accounts is inside this invariant's blast radius, and **MD-14 records that INV-08 is currently held by intent rather than by a control.** AC-13's production refusal is the one guard this ticket adds. |
| INV-11 | Deleting a room deletes its seats. The cascade is a foreign-key delete rule written **in this migration**. Its note also records that INV-11 reaches devices indirectly through INV-06, INV-04, INV-05 and INV-07 — a chain this ticket writes every link of. |
| INV-12 | A Member may not be deleted while occupying a seat or owning a device; refused, not cascaded. The migration's delete rules on the member references decide whether the database would cascade underneath the refusal ADR-005 requires. A `ON DELETE CASCADE` here makes INV-12 unenforceable at the layer that matters. |

**INV-10 is left off, under instruction, and this story does not agree that it was not in play.**
`ticket.yaml`'s header says it *"is deliberately absent and must not be added back at SPEC"*, and
`.ai/registry/features.md:152` says the same — it needs `btree_gist` and a generated column, nobody
has chosen the shape, and it stays enforced at the seam as debt. Both are registry-plane statements
and this stage complies with them.

What it will not do is present that compliance as reasoning. By the test `invariants.md` sets, INV-10
**was** in play: the shape had to be considered and a choice was made to leave it at the seam, which
is precisely the evidence the file says not to discard. The honest record is that INV-10 is excluded
by decision rather than by analysis, and `Q-5` routes the discrepancy to the steward rather than
resolving it here. `invariants_touched` in `ticket.yaml` follows the instruction.

## Permissions

**No permission model changes and no rank gate is added or removed.** `src/lib/auth/permissions.ts`
is untouched by ADR-007's affected-documents table, `ROLE_RANK` and `can()` keep their meaning, and
this ticket adds no surface for a role to act on. Every existing gap stands exactly as
`GRP-01`, `MEM-01` and `SEA-01` recorded it: there is no session, no `Member.role` to read, and no
rank to compare, so the application is ungated before this ticket and ungated after it.

**Two things do change about security, and neither is a permission.** They are named here because
this is the section a reviewer reads when asking whether the change is safe.

- **RULE-02 loses its compiler-level backstop.** `@prisma/client` could not run in a browser, so an
  import from a client component failed the build. That was never a designed control, but it was the
  only guard on the seam that a pull request could not edit away. `@supabase/supabase-js` is
  isomorphic. Afterwards, lint and check D12 are the whole of the enforcement and both live in files
  the same commit as the breach can change. MD-33, and AC-6 and AC-7 are what this ticket does about
  it.
- **Row Level Security stays off, and after this ticket it rests on one clause.** ADR-002 turned RLS
  off on the premise that `src/lib/data/` is the only path in; ADR-007 §5 keeps it true only through
  §4, server-side clients only. The ADR states the consequence in terms this story repeats rather
  than softens: the day §4 is broken, RLS becomes mandatory, not advisable.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Turning Row Level Security on.** ADR-002 decided it off and ADR-007 §5 keeps it off. It becomes
   mandatory only on the revert condition in ADR-007, which is an event, not a task.
2. **INV-10's exclusion constraint.** Named by the feature row as debt and left at the seam. It needs
   `btree_gist` and a generated column and nobody has chosen the shape; see `Q-5`.
3. **A sign-in surface.** This ticket makes `auth.users` rows exist. It builds no login page, no
   session, and no rank gate — that is the `AUT` group, which has no feature row today because the
   sign-in feature was withdrawn on 2026-08-25 for a product discussion.
4. **Splitting this ticket.** `.ai/registry/features.md:152` forbids it and states the reason: D12 is
   red from the first commit until it is rewritten, so a split places a red pull request in the middle
   deliberately. This item is the reason `Q-1` cannot be answered by splitting.
5. **A second Supabase project.** ADR-007's *Implementation decisions* recommend `dev` and `prod`; the
   operator answered on 2026-08-26 that there is one project — *"Chỉ có 1 project supabase duy nhất."*
   That answer stands and this ticket does not reopen it. What it leaves unanswered is `Q-2`.
6. **Migrating existing data.** There is none. No migration has ever been applied and no row exists,
   which is the property ADR-007 §Context calls the reason the cutover is cheap now and will not be
   again.
7. **Deploying anything.** No environment is provisioned, no CI secret is set, and no production
   cutover is performed by this ticket. It makes the application capable of running against a real
   database on a machine that has credentials. **The CLI's local stack, named in five Givens on
   2026-08-27, does not weaken this item.** It is created by a command and thrown away, it issues its
   own keys, and `ADR-007` OQ-2 says CI needs no cloud credential for it — so nothing is provisioned
   and no secret is set. Installing the container runtime it needs is the operator's, once, and is
   `Q-2`'s cost rather than this ticket's work.
8. **Changing any DTO or any seam signature.** ADR-007 §1 requires the replacement to be
   module-for-module against the same types. AC-5 is the criterion. A change here would ripple to
   every caller and is the definition of XL in `.ai/01-operating-model.md` §Sizing.
9. **Rewriting checks other than D12.** MD-16's ten failing tests are D12's and are cleared here
   because ADR-007 §8 puts them here. The four missing checks recorded against MD-26, MD-27, MD-29 and
   MD-33 are the steward's and are not written by this ticket, even though this is the ticket that
   makes the suite green enough to add them.
10. **Approving the migration.** RULE-09 makes the human signature on the first migration the one stop
    inside this ticket. Drafting it is design work; approving it is not this ticket's to do and not
    DESIGN's to route around.
11. **Tracker synchronization.** `sync_enabled` is `false` (RULE-10).
12. **Pointing any automated run at the live Supabase project.** Added 2026-08-27 with `Q-2`'s
    answer, because that answer is only safe if this holds. The unit suite is pinned to
    `DATA_SOURCE=mock` by `.ai/standards/testing-standards.md`; the Playwright suite is pinned on its
    web server; the five database clauses run against the CLI's local stack. **Nothing under `tests/`
    and no CI job may read `SUPABASE_URL` from a cloud project.** `pnpm dev` on a credentialed machine
    is the one thing that reaches it, a human starts it deliberately, and that is unchanged from
    before this ticket. A test that reached the live project would also be writing to a database whose
    migration has no RULE-09 signature.

## Size

**`size_estimate: M`, set on the second run by `Q-1`'s exit (b). The estimate is honest about the
story and is not a claim about the implementation.**

The field's definition is *the BA's judgement at SPEC, read from the story's scope* — and read that
way this ticket is one operation: replace the implementation behind `src/lib/data/` with a second one
against the same DTOs, and flip which of the two is the default. Out of scope holds eleven items and
none of them is a second operation. `M` is that judgement.

**What DESIGN is owed, and it is the whole of what this number does not say.**
`.ai/01-operating-model.md` §Sizing gives two rows this ticket matches on footprint, and neither is
`M`:

- **XL — *any size, if it changes the schema*.** `schema_delta` is not `none`. Handling: *escalate*.
- **L — more than 12 files.** Handling: *must split at DESIGN*, which
  `.ai/registry/features.md:152` forbids, with a stated reason about D12 rather than about scope.

So `size` at DESIGN is expected to come out `XL`, and the two fields are expected to disagree. **The
disagreement rule must not be applied mechanically here.** It reads: *a story estimated M that designs
out to L means the story was under-specified, and DESIGN routes that back to SPEC rather than
splitting silently.* That inference is false in this case and re-running SPEC would produce this same
story again — the story is not under-specified, the field could not hold the truth. `Q-1` is the
record of why, it is routed to the steward, and it is the thing to read before routing this ticket
anywhere.

**The first run of this stage gated `BLOCKED` on exactly this and that verdict is not withdrawn as
wrong.** It is superseded by a decision. Both are kept, per RULE-14 and per the changelog below.

## Open questions

`Q-1` blocks. `Q-2` through `Q-5` do not, and each names what it gates.

### Q-1 — DECIDED FOR THIS TICKET, OPEN AS A MODEL DEFECT — `size_estimate` has no value this ticket can truthfully take

**Decided 2026-08-26 by the operator, exit (b): `size_estimate` is `M`.** Recorded from the reissue of
`/spec SYS-02` after this stage returned `BLOCKED`, under the standing instruction that a repeated
instruction is a decision made. The three exits and their costs are left below exactly as they were
written before the answer, because the cost of the chosen one is the thing a later reader needs.

**The ticket is unblocked. The defect is not fixed, and the two are different.** Exit (b) was named in
this story as *"the fastest, and the one that leaves a false number in a field that gates a check"* —
that sentence is still true, and it is now describing this file. What remains open is routed to the
steward and blocks nothing: the model gives a BA no way to write *larger, and correctly so*, and
SYS-02 is only the first ticket to reach that gap. See the note at the end of this question.

**Routed to:** the steward, for the model defect alone. **Blocks:** nothing.

The three statements below are each quoted from a document, and they cannot all hold at once:

1. `.ai/01-operating-model.md` §Sizing — **XL is *any size, if it changes the schema*, and XL
   escalates.** `ticket.yaml` sets `schema_delta` to *"first migration — schema,
   `Account.auth_user_id`, INV-04/05/06 constraints"*, and both it and the feature row say that is
   **expected here rather than a defect**.
2. `.ai/01-operating-model.md` §Definition of Ready item 5 — **`size_estimate` is S or M**, produced
   by `ba` at SPEC. The field's own comment in `.ai/templates/ticket.yaml` reads `# S|M`. There is no
   third value.
3. `.ai/registry/features.md:152` — **not to be split**, because D12 is red from the first commit
   until it is rewritten and splitting places a red pull request in the middle on purpose. The same
   table independently puts this ticket at **L**, *more than 12 files*, whose handling is *must split
   at DESIGN*.

So the normal exit is closed twice over: a ticket too large for `M` is meant to be refined until it
fits, and this one is forbidden from being refined that way by the registry, for a reason that is
about CI rather than about scope.

**This is a defect in the model, not in the ticket, and it was reachable the moment ADR-007 was
accepted.** The two-field sizing design — recorded in `.ai/steward/context.md` — assumed every ticket
a BA can estimate is `S` or `M`, and gave the BA no way to say *larger, and correctly so*. SYS-02 is
the first ticket whose `schema_delta` is deliberately non-`none`, and it is therefore the first one to
reach the gap.

**Three exits, and the choice is a human's under RULE-01 because two of them amend the operating
model:**

- **(a) Give `size_estimate` an `L` value, or an explicit escalation value.** The smallest change to
  the model, and it makes the BA able to state the truth. It means DoR item 5 has to say what happens
  next — presumably that an `L` estimate routes to a human rather than to READY, which is what §Sizing
  already says XL does.
- **(b) Declare that `size_estimate` describes the story's scope and not the implementation's
  footprint, and set it to `M`.** Defensible on the field's own definition — *from the story's scope
  and its Out-of-scope section* — and it is the reading under which the two fields genuinely differ.
  It costs the honesty of the number: DESIGN would then set `size: XL` and the disagreement rule
  (*a story estimated M that designs out to L means the story was under-specified*) would route this
  ticket back to SPEC for a defect SPEC did not have.
- **(c) Accept that SYS-02 escalates by §Sizing and never passes DoR**, and run it as an escalated
  ticket by human decision, the way ROO-01 was resumed in prose. Honest, and it means the loop's
  normal path does not carry the ticket that makes the loop's product real.

This story recommends **(a)**, and states its cost: it is a change to
`.ai/01-operating-model.md`, which is RULE-01 territory and needs the steward and an ADR-shaped
record, so it is slower than (b) by exactly the amount that makes it durable. (b) is the fastest and
is the one that leaves a false number in a field that gates a check.

**Outcome, 2026-08-26: (b), by the operator. The recommendation was not taken and is not withdrawn.**
Exit (b) was the only one of the three this stage could execute — (a) amends the operating model,
which is the steward's and RULE-01's, and (c) was the `BLOCKED` verdict the reissue overrode. The
recommendation stands as the durable fix and what it needs is one steward change: **a value in
`size_estimate` for work that is correctly larger than `M`, and a sentence in DoR item 5 saying where
such a ticket goes** — presumably to the human escalation §Sizing already routes `XL` to, rather than
to `READY`. Until that exists, the next ticket with a non-`none` `schema_delta` reaches this same
question, and the loop's answer to it is now a precedent rather than a decision.

### Q-2 — ANSWERED 2026-08-27 — With one Supabase project, what does `pnpm dev` and the e2e suite run against?

**Answered at this stage, on the `R6` route out of the QA gate. The question as posed had three
legitimate answers and this is the second of them; the other two are kept below with their costs,
because the one chosen has a ceiling and a reader needs to see what would lift it.**

| | Answer | What it needs | What it gives |
|---|---|---|---|
| (a) | A second Supabase project, `dev` | The operator creates it; keys into three `.env.local` files and into CI | Reversed on 2026-08-26 by the operator — *"Chỉ có 1 project supabase duy nhất"* — and out-of-scope item 5 says this ticket does not reopen it |
| **(b)** | **The CLI's own local stack** | **A container runtime on whatever machine runs the tests. Nothing provisioned, no key, no cost** | **A migrated, emptiable database that is not the product's. TAKEN** |
| (c) | Accept the five clauses as verified by hand after the migration is signed | A change to the Definition of Done, which is `.ai/01-operating-model.md` and human-only | Nothing to build, and the cutover reaches DONE never having been executed once |

**(b) is taken and this stage did not invent it.** `ADR-007` OQ-2 is registry plane and `ACCEPTED`,
and it already names `supabase db reset` against `supabase/migrations/` as how the committed types are
produced, adding that **CI needs no cloud credential** to do it. The instrument was decided; what was
missing was that no acceptance criterion pointed at it. Five Givens now do, under *The environment each
criterion is observed in*.

**(c) is refused rather than declined.** It is the cheapest today and it is the one exit this stage
could not take even if it wanted to: *every AC maps to a named test* is a Definition of Done item in
`.ai/01-operating-model.md`, RULE-09 makes that file human-only, and a `ba` waiving a gate item to
clear a gate it is standing at has removed the gate.

**What (b) does not give, stated because it is the part that will surface at QA.** The loop's machine
has no container runtime — `which supabase` and `docker info` both came back empty on 2026-08-27 — so
the five clauses will be green in CI and *not executed here*. A QA session reports what it ran, and it
will not have run these. **That residue is (a)'s or a container runtime's to remove, and both are the
operator's**, which is why this question stays visible rather than closing.

**One correction to the question below, which is otherwise kept as first posed.** It says the
Playwright suite *"cannot run on mock without testing something nobody ships"*. That is true of what
Playwright is for and it is not true of this repository today: `playwright.config.ts:36` already pins
`DATA_SOURCE=mock` on its web server, and this ticket does not change that line. So the e2e suite is
pinned like the unit suite, and the consumer that is genuinely unpinned is `pnpm dev` alone — which a
human starts deliberately, on a machine that has credentials, and which out-of-scope item 12 leaves
exactly where it was.

---- THE QUESTION AS FIRST POSED, KEPT ----

**Routed to:** the operator. **Blocks:** nothing at SPEC. **Blocks:** a safe `/qa` on every ticket
after this one.

`ticket.yaml`'s precondition 2 records the operator's answer — one project, not two — and states that
the *consequence is unchanged by the answer and SPEC must carry it*. This is that carriage.

ADR-007 §7 defaults `DATA_SOURCE` to `supabase`, so with one project every `pnpm dev` and every
`pnpm verify` reads and writes the same database the product uses.

**Half of it is already answered and the ticket header did not have that.**
`.ai/standards/testing-standards.md` was rewritten for ADR-007 and now requires that **every unit and
component test set `DATA_SOURCE=mock` deliberately** — so the unit suite is pinned by the standard,
and AC-2 is the criterion. What the standard does not pin is the other two consumers: `pnpm dev`, and
the Playwright suite, which exercises the application as a user and therefore cannot run on mock
without testing something nobody ships. On one project both reach production data.

Not blocking for this ticket, because nothing this ticket does is made wrong by the answer. Blocking
for the ticket after it, because `06-test-report.md` would be measured against live data.

### Q-3 — ROUTED TO DESIGN — Which tool applies the first migration, and which URL does it need?

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing. **Blocks the migration:** yes.

`ticket.yaml`'s precondition 1 was verified on 2026-08-26 by reading key names in all three
worktrees: `.env.local` exists in each and carries `DATA_SOURCE`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. **`DATABASE_URL` and `DIRECT_URL` are absent from
all three.**

Whether that blocks is a real question rather than an oversight, and the ticket header states it
correctly: `@supabase/supabase-js` authenticates with a URL and a key and needs no Postgres
connection string, so the two URLs are needed for the **migration** half and not for the **client**
half. Precondition 3 adds that `.env.example` still names Prisma's field layout, that the two-URL
split is a pooler property and survives, and that the wiring does not — **to be verified against the
Supabase CLI's own documentation, not from memory.** DESIGN establishes which tool runs the migration
and therefore which of the two URLs it needs, and says so in section 6 so QA is not the stage that
discovers it.

### Q-4 — OPEN — `requires_adr` is `false` while `schema_delta` is not `none`

**Routed to:** the orchestrator, at DoR. **Blocks:** nothing this stage owns.

DoR item 4 reads *`schema_delta` is `none`, **or an approved ADR is linked***. `schema_delta` here is
not `none`, and `requires_adr` in `ticket.yaml` is `false`. ADR-007 is `ACCEPTED` and is unambiguously
the ADR this ticket implements — the feature row says so and the ticket header says so — so the
substance of item 4 is satisfied and this is a bookkeeping question rather than a real gap.

It is raised because *linked* is the word the item uses, and `ticket.yaml` has no field that links an
ADR; the reference lives in prose in its header comment. If item 4 is checked mechanically, as
§Definition of Ready says it is, a checker reading the fields alone sees a non-`none` `schema_delta`
and `requires_adr: false` and has nothing to resolve against. This stage does not edit those fields:
`requires_adr` was set at BACKLOG and changing it is not SPEC's.

### Q-5 — OPEN — Is INV-10's exclusion from `invariants_touched` the right instrument?

**Routed to:** the steward. **Blocks:** nothing.

`invariants_touched` excludes INV-10 because two registry-plane documents instruct it, and this story
complies. The reason it is raised is that `.ai/registry/invariants.md` and those instructions are
answering different questions with the same field. The file's test is *what the change could affect,
including anything whose shape had to be considered*; the instruction's test is *what gets a
constraint in this migration*. Under the first, INV-10 belongs on the list; under the second it does
not.

The field can only carry one of the two readings, and today it carries whichever the most recent
instruction assumed. What makes it worth an answer rather than a shrug is check R8: the reviewer
reasons through each ID in `invariants_touched` and cites where it is held. Under the second reading,
an invariant deliberately left unenforced is invisible to R8 — which is the one place a reader would
otherwise be told, at the moment the schema is being signed, that seat overlap is held by nothing but
the seam.

## Changelog

- `2026-08-26T08:03:28Z` — story created at SPEC. Gate BLOCKED on `size_estimate` alone; every other
  section is complete. `invariants_touched` extended from three IDs to ten against `ticket.yaml`'s
  stated expectation, with per-ID grounds. Raised by `ba`. Amended by `ba`.
- `2026-08-26T08:33:56Z` — sections *front-matter*, *heading note*, *Size* and `Q-1` amended. Gate
  BLOCKED → PASS and `next_state` BACKLOG → READY, on the operator's reissue of `/spec SYS-02` after
  the blocked verdict, taken as exit (b) of `Q-1`: `size_estimate: M`. **The BLOCKED verdict is not
  withdrawn as mistaken and its reasoning is kept in full** — it was superseded by a decision, which
  is a different thing, and a story that silently agreed with the present would be worth less than
  one that shows what it argued. No acceptance criterion, no invariant and no out-of-scope item
  changed; the scope this stage described is the scope that passed. Raised by the operator. Amended
  by `ba`.
- `2026-08-27T07:56:34Z` — sections *heading note*, *Acceptance criteria*, *Out of scope* and `Q-2`
  amended on the third run, the `R6` route out of `06-test-report.md`'s `gate: FAIL`. Gate PASS,
  `next_state` READY -> DESIGN. **`Q-2` answered**, exit (b): the five clauses that need a migrated,
  emptiable database are observed against the Supabase CLI's local stack, which `ADR-007` OQ-2 already
  names and which needs no cloud credential. A new section, *The environment each criterion is observed
  in*, carries it, and the *Given* of AC-1, AC-9, AC-10, AC-11 and AC-12 names it. **The five previous
  Givens, kept verbatim, in order:** *"Given a checkout with credentials present and no `DATA_SOURCE`
  set in the environment"*; *"Given the committed generated types and the migrations directory"*;
  *"Given the first migration applied to an empty database"*; *"Given the migrated database"*; *"Given
  an empty migrated database"*. **No When, no Then and no invariant changed, and no criterion was
  narrowed** — every clause `06-test-report.md` called unexecutable is still asserted in full. Out of
  scope gains item 12, which is what makes the answer safe: no automated run may reach the live
  project. `invariants_touched` and `size_estimate` are unchanged and were re-read, not re-derived.
  Raised by `qa`. Amended by `ba`.
