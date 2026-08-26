---
ticket: GRP-02
stage: QA
agent: qa
produced_at: 2026-08-26T06:43:59Z
inputs_read: [ .ai/board/tickets/GRP-02/01-story.md, ".ai/board/tickets/GRP-02/02-design.md — section 6 only", .ai/board/tickets/GRP-02/ticket.yaml, .ai/templates/test-plan.md, tests/e2e/groups.spec.ts, tests/e2e/members.spec.ts, tests/unit/groups.test.ts, tests/unit/members.test.ts, tests/unit/seam-parity.test.ts, playwright.config.ts, vitest.config.mts, package.json ]
consulted:
  - with: tech-lead-design
    asked: "F-1 in 99-questions.md — section 6 names no seam call, so `tests/unit/member-groups.test.ts` cannot be written under RULE-05. Which exported function assigns a member to a group, what does the member DTO carry for the group, and does AC-1's name resolution have a seam half at all?"
    answer: "Not answered. Raised as a file, non-blocking, and the gate does not wait on it. Section 6 is amended by `tech-lead-design`, not answered in place (RULE-14)."
    resulted_in_amendment: false
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# GRP-02 — test plan

**Isolated dispatch** (RULE-13). This session was fresh, read files only, and held no channel to
`developer` or `tech-lead-review`. `03-impl-log.md` and `04-review.md` are both in the ticket folder
and neither was opened; `chat_before_verdict: none` is an attestation under RULE-12 and is true as
written. The one channel used points backwards, to `tech-lead-design`, which the topology allows —
it is `99-questions.md` F-1, it is recorded in `consulted` above, and it is not an answer.

**Inputs are `01-story.md` and section 6 of `02-design.md`.** `src/**` was not read (RULE-05).
`02-design.md` sections 0 through 5 and 7 were not read; `sed -n '623,785p'` is the whole of what this
session took from that file. `ticket.yaml` was read for `allowed_paths`, which `/qa` step 0 requires
in order to classify a dirty tree, and for `chat_budget`.

Everything below stands alone (RULE-16).

## The shape of this plan, and the one thing it does not have

**Every acceptance criterion is covered at e2e, and none is covered at the seam.** That is not the
usual shape — `MEM-01` and `GRP-01` both carry a unit file and an e2e file — and the reason is F-1 in
`99-questions.md`: section 6 of this design is a `data-testid` contract and names no seam call, so a
unit test has no function to address and RULE-05 forbids going to look for one.
`tests/unit/member-groups.test.ts` is therefore an enumerated `allowed_path` that this stage left
empty rather than filled with a guessed export name.

**It does not cost coverage and it does cost strength.** Every criterion is observable from outside
the system through the surface, which is what an acceptance criterion is; nothing below is untested.
What is weaker is the four "nothing else changed" criteria — AC-8, AC-9, AC-10 and AC-11 — which are
asserted by reading rendered tables. A write that changed a field no column renders would pass them.
Section 6.4 concedes the same point in its own closing line, *"the seam half is stronger anyway"*.

## Coverage map

Every AC from the story maps to at least one named test. The test name contains the AC ID. All rows
are `tests/e2e/member-groups.spec.ts`.

| AC | Test name | Level | Selectors used |
|---|---|---|---|
| AC-1 | `AC-1: the members list shows each member's group by name, never its identifier` | e2e | `members-row-<email>-group`, `members-table`, `members-row-<email>-email` |
| AC-2 | `AC-2: a member who belongs to no group is shown as belonging to no group` | e2e | `members-row-<email>-group`, `members-row-<email>-assign`, `member-create-*` |
| AC-3 | `AC-3: a member with no group is assigned to one, and the list shows it without a reload` | e2e | `members-row-<email>-assign`, `member-assign-dialog`, `member-assign-group`, `member-assign-submit`, `members-row-<email>-group` |
| AC-4 | `AC-4: a member is re-assigned between groups, and no other member's group changes` | e2e | as AC-3, plus every `members-row-*` cell for the snapshot |
| AC-5 | `AC-5: every group in the tree is offered including nested ones, nothing else is, and the chooser is not free text` | e2e | `member-assign-group`, `member-assign-cancel`, `groups-row-<path>`, `group-create-parent` |
| AC-6 | `AC-6: assignment is refused when the chosen group no longer exists, and the member is unchanged` | e2e | `member-assign-group-error`, `member-assign-submit`, `groups-row-<path>-delete`, `group-delete-confirm` |
| AC-7 | `AC-7: a member belongs to at most one group, and no surface offers a way to hold both` | e2e | `member-assign-group`, `members-row-<email>-group` |
| AC-8 | `AC-8: assigning a member changes nothing else about that member` | e2e | `members-row-<email>-{name,email,role,seats,signin,group}`, `seats-row-*`, `devices-row-*` |
| AC-9 | `AC-9: nothing on this surface deletes a Member (INV-12)` | e2e | `member-assign-dialog`, `member-delete-confirm`, every `members-row-*` cell |
| AC-10 | `AC-10: nothing on this surface creates, renames, moves or deletes a group` | e2e | `groups-row-<path>-{name,parent,children}`, `member-assign-dialog` |
| AC-11 | `AC-11: nothing on this surface touches a seat, a device, a room or an occupancy` | e2e | `seats-row-<code>-{occupant,status}`, `devices-row-<assetTag>-{owner,seat,rank}` |

Three further tests carry no AC. Each guards a sentence in section 6.3 that would otherwise regress
silently, and each is named for the finding it guards rather than for a criterion it does not have.

| Section 6.3 | Test name | What it guards |
|---|---|---|
| item 2 (F-4) | `F-4 (section 6.3 item 2): submitting with the placeholder chosen is refused and does not unassign` | The placeholder is a validation refusal, not an unassignment. If it ever started removing a member from their group, this ticket would have grown the *remove from group* verb the story declined to grant — out-of-scope item 2, `Q-4` — with no criterion to fail. |
| item 3 (F-5) | `F-5 (section 6.3 item 3): assigning a member to the group they already belong to succeeds` | A no-op assignment is not a refusal. Nothing in the story says so, and a "already in that group" guard added later would be a rule nobody asked for. |
| item 6 (F-3) | `F-3 (section 6.3 item 6): a group rename is visible on /members, which is what the revalidation buys` | The observable half of the three `revalidatePath("/members")` lines. Without it they read as dead code to whoever tidies up next. MEM-01's F-6 is the precedent: the same revalidation was missing there and the e2e test is what reported it. |

### Two criteria whose Given could not be fully constructed, and what was done

**AC-8's *a seat and a device*.** A member this suite creates occupies no seat and owns no device, and
neither can be given to them: section 6.4 makes `/seats` and `/devices` **read-only** for this spec,
and section 6.2 constraint 3 forbids writing a seeded row. Rather than skip the clause, the AC-8 test
asserts the five member-side cells directly and then asserts that the **whole** of both tables is
identical across the assignment — which is a stronger statement than *this one member's seat did not
move*. AC-11 makes the same assertion independently and additionally requires that at least one seat
be occupied and one device owned before the act, so the comparison is not vacuous.

**AC-11's *a room*.** Section 6.4 restates no room selector, and per section 6's own opening line a
control absent from these tables does not exist as far as QA is concerned. The room half is asserted
in two parts instead: the assign dialog carries no room control (checked in AC-10's dialog sweep, which
is a `[data-testid*=...]` count inside `member-assign-dialog`), and the seat table is byte-identical
across the assignment — INV-11 makes seats the only thing that travels from a room, so an unchanged
seat table is an unchanged room's worth of seats. Recorded here rather than left to be noticed.

## Refusal cases

The tests that assert something is *not* possible. A suite with no refusal tests passes when the
check is deleted.

| Refusal | Test | Asserted |
|---|---|---|
| A group that no longer exists may not be assigned | AC-6 | `member-assign-group-error` is visible and carries a message, the dialog stays open, and the member's `-group` cell is unchanged |
| The placeholder is not an unassignment | F-4 | `A group is required.` in `member-assign-group-error`, twice — once for a member with no group and once, the half that matters, for a member who has one |
| Nothing outside the group tree may be chosen | AC-5 | the chooser's non-placeholder option labels equal the set of `groups-row-<path>` paths exactly, and the control is a `SELECT` |
| A member may not hold two groups | AC-7 | the chooser is not `multiple`, exactly one option is selected, and the cell reads the second group and does not contain the first |
| This surface deletes no member | AC-9 | no `[data-testid*="delete"]` inside `member-assign-dialog`, `member-delete-confirm` absent while it is open, and the email set is unchanged across every control the ticket adds |
| This surface writes no group | AC-10 | no `[data-testid*="create"]` and no `[data-testid*="edit"]` inside `member-assign-dialog`, and the whole group snapshot is unchanged |

**AC-6's message is asserted for existence, not for its text.** The story says *a message saying the
group no longer exists*; the exact string is a section 1 fact and section 6 does not restate it, so the
test asserts the element is visible and non-empty and puts the weight on the two things it can state
exactly — the dialog does not close, and the member's group does not move. F-4's string **is** asserted
by value, because section 6.3 item 2 gives it verbatim: `A group is required.`

## Invariant probes

`invariants_touched` is `[]` — considered, and none engaged. The story walks all eleven issued IDs
one at a time and the argument is that no relation exists from a Group to a Seat, a Device or a Room
for a cascade to travel along. This plan does not take that on trust: INV-12 has a probe because the
story wrote AC-9 for it, and the three occupancy invariants have one because AC-11 is cheap.

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-12 — a Member may not be deleted while occupying a seat or owning a device | `AC-9` | Present. The ticket performs one write on a Member and deletes nothing; the probe is that the email set on `/members` is unchanged across every control this ticket adds, and that the assign dialog offers no delete. |
| INV-01, INV-02 — seat occupancy | `AC-8`, `AC-11` | Present, as the unchanged `seats-row-<code>-occupant` set. Not engaged: nothing here writes an occupancy. |
| INV-03 — seat status is derived | `AC-11` | Present, as the unchanged `seats-row-<code>-status` set. |
| INV-04, INV-05, INV-06, INV-07 — device ownership and designation | `AC-8`, `AC-11` | Present, as the unchanged `devices-row-<assetTag>-{owner,seat,rank}` set. `-rank` is the designation, so a primary silently downgraded would show here. |
| INV-08 — there is no self-signup | none in this file | Absent on purpose. This ticket creates no account and no member; `members-row-<email>-signin` is asserted unchanged in AC-8, and `tests/e2e/self-signup.spec.ts` owns the invariant. |
| INV-10, INV-11 — room geometry and cascade | none directly | Absent on purpose, and the reason is in *AC-11's a room* above: no room selector reaches QA, and the seat table standing in for it is the only channel section 6 provides. |

## Fixtures

**None are quoted, and none could be.** `src/lib/data/fixtures.ts` is under `src/**` and RULE-05
forbids reading it. Section 6.2 states the seed as prose — three members, two groups, every member in
a group — and this suite deliberately does not rely on any of it: section 6.2 constraint 2 records
that `tests/e2e/groups.spec.ts` sorts first alphabetically and **deletes `Platform`** as its AC-13,
which detaches two of the three seeded members for the rest of the run.

Every Given below is constructed through the surface and taken down again. No fixture identifier
appears anywhere in `tests/e2e/member-groups.spec.ts`. The seed is read in exactly two places, and
both are reads: AC-1 walks every listed row to check the group column is non-blank for rows this suite
did not create (section 6.2 constraint 3 permits this), and AC-11 requires the seat and device tables
to be non-empty with at least one occupied seat and one owned device so its comparison says something.

**Group names are minted alphanumeric**, `QAGrp<run><label><n>`, where every other suite in this
repository mints `QA-Grp-<run>-...`. That is deliberate and section 6.1 is the reason: it asks for
*"an assertion that the cell does not contain a `-`"* as the cheap second half of AC-1's *never its
identifier*, and every group id is a `crypto.randomUUID()`, which always contains one. A name with a
dash in it would make that assertion vacuous.

## Out of scope for this plan

- **The seam.** F-1 in `99-questions.md`. `tests/unit/member-groups.test.ts` is not written, and the
  four "nothing else changed" criteria are correspondingly weaker than they would be with it. This is
  the one item here that is a gap rather than a boundary.
- **`member-assign-empty`.** Section 6 lists it — *a sentence rendered inside the dialog only when no
  group exists at all* — and maps it to no AC. Testing it means deleting every group in the system,
  seeded ones included, which section 6.2 constraint 3 forbids and which no criterion asks for. Left
  untested, stated rather than skipped silently.
- **`member-assign-error`.** Section 6 lists it — *a message belonging to no field, the member is
  already gone* — and maps it to no AC. Constructing it means deleting the member from a second page
  while the dialog is open, which is MEM-01's verb and not a criterion here.
- **The Permissions table.** Out-of-scope item 11 and the story's own Permissions section: there is no
  session, no rank to compare and no `AUT` feature, so **anyone who can reach the application can move
  any person into any department**. Nothing here asserts a role, because there is no role to assert.
  `Q-2` — may a Manager assign — is open and is the operator's.
- **The Prisma half of the seam.** `tests/unit/seam-parity.test.ts` already asserts that every
  exported name and arity matches between `mock/` and `prisma/`, generically, so the function this
  ticket adds is covered there without this plan naming it. It is not in `allowed_paths` and was not
  touched.
- **Performance, accessibility beyond the standards baseline, and anything behind an unapproved
  schema.** `schema_delta` is `none` and `requires_adr` is `false`.

## Selector gaps

**None.** Every control the eleven criteria need is in section 6, and no test below was written against
a selector absent from it. Two near-misses are recorded because they are the kind of thing that looks
like a gap in review:

1. `member-create-dialog`, `member-delete-dialog`, `group-create-dialog` and `group-delete-dialog` are
   used by `tests/e2e/members.spec.ts` and `tests/e2e/groups.spec.ts` and are **not** in section 6.4.
   This file does not use them. Every wait it performs is on a control section 6.4 does list — the
   create form's first input, the delete confirmation's own button — which is the same technique
   `tests/e2e/members.spec.ts` uses for `device-create-dialog` and for the same reason.
2. AC-6's refusal string and AC-11's room selector, both covered above.

**F-1 is not a selector gap.** It is a seam-call gap, it concerns a file this plan does not deliver
rather than a criterion it cannot cover, and it does not block: every AC has a row above.
