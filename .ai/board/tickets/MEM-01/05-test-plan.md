---
ticket: MEM-01
stage: QA
agent: qa
produced_at: 2026-08-24T08:59:18Z
inputs_read: [ .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/02-design.md, .ai/board/tickets/MEM-01/ticket.yaml, .ai/board/tickets/MEM-01/99-questions.md, .ai/standards/testing-standards.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# MEM-01 — test plan

**Pass 4.** Confirmed for the full 16 criteria, 34 tests across unit (18) and e2e (16). All tests pass.
Pass 1 (2026-08-23T10:27:45Z) planned eleven criteria and reported F-6 and F-7. Pass 2
(2026-08-24T02:33:50Z) wrote the tests for `ba`'s five lettered criteria, made F-7's repair in
`tests/e2e/devices.spec.ts`, restored AC-11 to e2e, and raised F-9. Pass 3 (2026-08-24T10:22:00Z)
measured F-9's failure rate. Pass 4 verifies the full suite with F-9 resolved. The suite it describes
is the suite in the tree.

**What was read, stated exactly rather than by category.** `01-story.md` in full, and of
`02-design.md` **section 6** in full plus **section 1.1** and **1.2**. `src/**` was not read and no
file under it was opened (RULE-05).

The two sections outside 6 are pointers section 6 itself makes: section 6.1 lists the seam calls this
ticket's tests may make and then says *"The exact reason strings are in section 1.1 and are part of
the contract — assert on them by value."* A test cannot assert a value it is not allowed to see.
`tests/unit/devices.test.ts` recorded the same pointer on `DEV-01`.

**Section 1.4 was NOT read this pass.** Pass 1 read it after a failure, to decide routing. This pass
had no such question: F-9's routing is settled by measurement alone.

**Isolated dispatch** (RULE-13). No message channel to `developer` or `tech-lead-review`, and
`chat_before_verdict` is `none` in both this document and the report.

**`04-review.md` and `03-impl-log.md` were not opened.** They are in the ticket folder and they are
not QA's inputs — a QA agent that reads the review is testing the reviewer's conclusions instead of
the story.

## The two levels, and why each criterion sits where it does

`tests/unit/members.test.ts` — vitest, 18 tests, against the seam listed in section 6.1.
`tests/e2e/members.spec.ts` — Playwright, 16 tests, against the selectors in section 6 and 6.3.

Five criteria are **e2e only**, and that is a property of the criteria rather than a preference.
AC-3, AC-3c, AC-7 and AC-7b refuse at the form and AC-8 is a confirmation dialog; section 6.1 grants
no seam call that reaches any of them. Validation lives in `src/lib/validation/member.ts`, which is
not on the list, and a confirmation is not a seam concept.

**No criterion is unit-only this pass.** AC-11 was, in pass 1, and that was finding F-6 rather than a
preference. F-6 is answered — the member write actions now revalidate `/devices` — so AC-11 is
asserted at both levels, and the e2e test asserts section 6.3's load-bearing sentence *before* it
depends on it, so a revalidation that went away would be reported rather than silently worked around.

Everything else is asserted at both levels, deliberately. The seam test can see fields the surface
does not render — `groupId`, the `Account` rows, `Seat.occupantId`, the whole device table — and the
e2e test can see the two things the seam cannot: which of the two delete dialogs opened, and whether
the outcome reached the page without a reload.

## Coverage map

Sixteen criteria, thirty-four tests. Every AC maps to at least one named test, and every test name
contains the AC ID.

| AC | Test name | Level |
|---|---|---|
| AC-1 | `AC-1: every member is listed with a role, and occupancy is readable for the seated and the unseated alike` | unit |
| AC-1 | `AC-1: every member is listed with their role and their occupancy, and a create control is present` | e2e |
| AC-2 | `AC-2: the new member is listed with the role chosen, occupies no seat, and belongs to no group` | unit |
| AC-2 | `AC-2: each of the three ROLE_RANK values is a role a member can be created with` | unit |
| AC-2 | `AC-2: a member is created with the role chosen, occupies no seat, and is confirmed without a reload` | e2e |
| AC-3 | `AC-3: creation is refused when a required field is missing, blank, or no role is chosen` | e2e |
| AC-3a | `AC-3a: a duplicate email is refused with DUPLICATE_EMAIL, and the member who holds it is unchanged` | unit |
| AC-3a | `AC-3a: creation is refused when the email is already held by another member` | e2e |
| AC-3b | `AC-3b: an email differing only in case IS created, and both members are listed with their own email` | unit |
| AC-3b | `AC-3b: an email differing only in case is created, and both members are listed with their own email` | e2e |
| AC-3c | `AC-3c: creation is refused when the email is not a well-formed address` | e2e |
| AC-4 | `AC-4: the account table is untouched, and the new member has no account` | unit |
| AC-4 | `AC-4: the create form offers no way to sign in, and the member it creates has no account (INV-08)` | e2e |
| AC-5 | `AC-5: the new value is stored, the role and the occupancy are untouched, and no other member moves` | unit |
| AC-5 | `AC-5: an existing member's attributes are changed, and nothing else is` | e2e |
| AC-6 | `AC-6: USER becomes MANAGER, nothing else about them changes, and no other member's role changes` | unit |
| AC-6 | `AC-6: a member's role is changed, and nothing else about them or anyone else changes` | e2e |
| AC-7 | `AC-7: editing is refused when a required field is cleared, and the member keeps its previous values` | e2e |
| AC-7a | `AC-7a: another member's email is refused with DUPLICATE_EMAIL, and neither member is changed` | unit |
| AC-7a | `AC-7a: updating a member that does not exist is refused with NOT_FOUND and changes nothing` | unit |
| AC-7a | `AC-7a: editing is refused when the email is already held by a different member` | e2e |
| AC-7b | `AC-7b: editing is refused when the email is not a well-formed address` | e2e |
| AC-8 | `AC-8: deletion is not performed until it is confirmed` | e2e |
| AC-9 | `AC-9: the member is gone, and no member, seat or device is otherwise affected` | unit |
| AC-9 | `AC-9: deleting a member who does not exist is refused with NOT_FOUND and changes nothing` | unit |
| AC-9 | `AC-9: a member who is referenced by nothing is deleted, and no one else is affected` | e2e |
| AC-10 | `AC-10: refused with REFERENCED, the seats are named, and nothing is written` | unit |
| AC-10 | `AC-10: the refusal is repeatable — three refused deletes leave the store bit-identical` | unit |
| AC-10 | `AC-10: deleting a member who occupies a seat is refused, and the refusal names the seat (INV-12)` | e2e |
| AC-11 | `AC-11: refused with the device count, the seat half reads empty, and no device is touched` | unit |
| AC-11 | `AC-11: deleting a member who owns a device is refused, and the refusal states how many (INV-12)` | e2e |

The three remaining unit tests are the invariant probes, below. They carry an invariant ID rather
than an AC ID because they are swept over the whole store rather than over one criterion's subject.

## Refusal cases

The tests that assert something is *not* possible. `01-story.md` calls AC-3, AC-3a, AC-3c, AC-4,
AC-7, AC-7a, AC-7b, AC-8, AC-10 and AC-11 the refusals — ten of sixteen criteria — and a suite that
covered only the successes would pass against a build with both invariants deleted.

| Refusal | Where | What it would catch |
|---|---|---|
| A missing, blank or whitespace field on create | AC-3, e2e | A `required` attribute standing in for a trim — `"   "` is a name to HTML and is not one here |
| No role chosen on create | AC-3, e2e | The model's `@default(USER)` silently satisfying the criterion that refuses an unchosen role |
| An email another member already holds, on create | AC-3a, both | A create path with no uniqueness check, which the `@unique` column would then reject at the database instead of at the form |
| A malformed email on create | AC-3c, e2e | A schema with `.min(1)` and no `.email()`. Asserted as *a different message from the blank one*, because a form with no format check shows the blank message and nothing else |
| No credential field on the create form | AC-4, both | The self-signup route INV-08 removes, reached from a surface with no session at all |
| A cleared or whitespace field on edit | AC-7, e2e | An update path that validates on create and not on edit |
| No role selected on edit | AC-7, e2e | An edit select with no empty placeholder, which would make the criterion unreachable rather than passing |
| Another member's email, on edit | AC-7a, both | A uniqueness check that runs on create only |
| A malformed email on edit | AC-7b, e2e | The same gap as AC-3c, on the other schema |
| A dismissed confirmation | AC-8, e2e | A delete that fires on the click and asks afterwards |
| Deleting a seated member | AC-10, both | The seat half of INV-12 |
| Deleting a member who owns a device | AC-11, both | The device half of INV-12 — the half that strands equipment, and the one a combined test would hide |
| Deleting a member who does not exist | AC-9, unit | `NOT_FOUND` reported as `REFERENCED`, which would make every AC-10 assertion pass for the wrong reason |
| Updating a member who does not exist | AC-7a, unit | The same control on the other side: `NOT_FOUND` reported as `DUPLICATE_EMAIL` |
| Three consecutive refused deletes | AC-10, unit | A refusal path that writes — a tombstone, or a remove-then-restore |

**AC-3b is the one criterion that asserts a refusal must *not* happen**, and it is the reason the
duplicate-email tests are safe to write. `Member.email` is `@unique` and Postgres compares it
case-sensitively, so an implementation that case-folded would be stricter than the model — and an
over-strict refusal is invisible to every other test here, because it never produces a wrong row,
only a rejected one. It is asserted at both levels; the e2e half also proves the two rows are
separately addressable, which section 6 warns is where a lowercasing selector would go wrong.

## Invariant probes

For each ID in `invariants_touched`, the test that would fail if it stopped holding.

| Invariant | Probe test | Why it is shaped this way |
|---|---|---|
| INV-08 | `INV-08: no member this suite created holds a sign-in account` (unit) | Swept over every member this file created rather than over the one AC-4 made, so a create path that grows an account row on some branch is visible |
| INV-08 | `AC-4: the create form offers no way to sign in, and the member it creates has no account (INV-08)` (e2e) | The seam probe cannot see a password field that exists on a form and posts nowhere; this one can |
| INV-12 | `INV-12: no member who occupies a seat or owns a device can be deleted` (unit) | Swept over **every** member the store holds, not the two the criteria picked — a refusal correct for a seeded member and wrong for a created one would otherwise pass |
| INV-12 | `INV-12: getMemberReferences reports both halves for every member, always` (unit) | Section 1.2 rule 3 requires empty and zero rather than absent; a half that went missing makes AC-10's and AC-11's messages silently incomplete rather than visibly wrong |
| INV-12 | `AC-10: the refusal is repeatable — three refused deletes leave the store bit-identical` (unit) | The refusal must write nothing; a single-shot assertion cannot tell a refusal from a remove-and-restore |

Both sweeps assert their own non-vacuity first — that at least one member was created, that at least
one member is referenced — because a sweep over an empty set passes and reports nothing.

**The invariants `ADR-005` discharged are not probed, and that is deliberate.** INV-01, INV-05 and
INV-06 left `invariants_touched` when the cascade was rejected. `tests/unit/devices.test.ts` probes
all three already, and this suite writes no seat and only one device, so a probe here would assert
that this ticket did not do something it has no code path to do.

## Fixtures

**No fixture identifier appears in either file.** `src/lib/data/fixtures.ts` is under `src/**` and is
not readable at this stage (RULE-05), so no seeded email, seat code, asset tag or member id is quoted
anywhere.

Where a seeded entity is needed it is **discovered**:

| Needed | Discovered by |
|---|---|
| A member who occupies at least one seat (AC-10) | unit: the first `seats.listSeats()` entry with a non-null `occupantId`, then that occupant in `listMembers()`. e2e: the first row whose `members-row-<email>-seats` cell is not `none` |
| The seat codes that member occupies (AC-10) | unit: `seats.listSeats()` filtered by occupant, mapped to `code`, sorted. e2e: read out of the row's seats cell, so the row and the refusal dialog must agree |
| A member who holds an account (AC-4's control) | unit: `accounts.listAccounts()`. e2e: any row whose `signin` cell reads `account` |

Everything else is created by the test that needs it. `01-story.md` A-6 is the warrant: AC-9's,
AC-11's and AC-1's second Given are all constructible, and only AC-10's is not.

`beforeAll` in the unit file asserts the one Given it cannot construct and throws a named error if it
is missing, rather than letting a null surface three assertions later — A-5 says in terms that if the
seed does not hold this the story is amended, not worked around.

## What the suites leave behind

Section 6.2 forbids mutating any member that was already there when the spec started, because
`tests/e2e/devices.spec.ts` reads member full names out of `device-create-owner` and a renamed seeded
member would make an unrelated spec fail intermittently.

- **e2e** — every member it creates it deletes again, except the ones AC-9 and AC-11 consumed. It
  edits and deletes only members it created. AC-10 touches a seeded member with a delete that INV-12
  refuses, which writes nothing, and asserts afterwards that the whole list is unchanged. AC-11's
  member and its one device survive the run; the note at the foot of the spec file says why removing
  them would require a device write this ticket is forbidden.
- **unit** — the mock store is process-global within the file and has no reset hook (section 6.1), so
  members created by the earlier blocks are still present in the later ones. Every "nothing else
  changed" assertion is made against a snapshot taken immediately before the act, never against one
  from setup. Snapshots are `structuredClone`d, because the seam hands back live objects and a
  shallow copy would be mutated by the act under test.
- **Ordering.** Within the unit file the AC-11 block runs last of the criteria, because it gives a
  member a device and INV-12 then makes that member permanently undeletable. The invariant sweeps run
  after it on purpose — that member is what makes the INV-12 sweep non-vacuous for the device half.

## `tests/e2e/devices.spec.ts` — the one file here that is not this ticket's

Design version 2 added it to `allowed_paths` on `ROO-01`'s Q11 precedent, to carry F-7's repair. The
edit is six lines at `:368-373`: one retrying assertion before `AC-4`'s `rowState` snapshot, plus the
comment saying why. It deletes nothing and weakens nothing.

**That repair works and has not failed once since it landed.** It is also not sufficient, which is
F-9 and is the subject of `06-test-report.md`.

## Out of scope for this plan

- **Permissions and roles as a guard.** MEM-01 enforces none — `01-story.md`'s Permissions section
  says so in terms, and out-of-scope item 1 sends the whole subject to `AUT`. The intended matrix in
  that section is recorded for a future ticket and no test asserts it. `tests/unit/permissions.test.ts`
  continues to assert `ROLE_RANK` and `can()`, and this ticket does not touch it.
- **The Prisma implementation.** `DATA_SOURCE=mock` throughout, and section 1.2 says the four new
  functions return `notWired(...)`. `tests/unit/seam-parity.test.ts` is what covers the swap and it is
  not this ticket's file.
- **The three declared cascades in F-4** — `Account`, `SeatRequest`, and `Account.createdBy`. F-4's
  proof is that no member holding an account or a request is deletable, so no test could enter any of
  those branches. AC-9's unit test asserts the account table is untouched by a delete that *does*
  succeed, which is the strongest statement available from outside.
- **`Member.authUserId`** — F-5. The field is in no schema and no DTO. AC-4 is asserted against the
  `Account` model, which section 6.1 grants and which exists.
- **Performance, accessibility beyond the standards baseline, and pagination or search** — the last
  is out-of-scope item 8 and has no feature row.
- **`tests/e2e/smoke.spec.ts`** — untouched. It addresses `members-page` and no member row, which is
  why re-keying rows by email did not reach it (`ticket.yaml`, `allowed_paths`).

## Selector gaps

Controls an AC needs that design section 6 does not provide.

### G-1 — CLOSED. Section 6.3's device route works

Pass 1 measured a member created on `/members` absent from `device-create-owner` on `/devices`, which
made AC-11's e2e Given unbuildable and forced it to the seam. That was F-6; design version 2 resolved
it in favour of section 6.3 and the member write actions now revalidate `/devices`.

**Re-measured this pass and it holds.** AC-11's e2e test navigates straight from the create on
`/members` to `/devices` with no intervening device write, and the new member is in the select. The
assertion sits *before* the device create rather than after it, so it is the revalidation that is
being tested and not an accident of ordering.

### G-2 — the reason strings QA is told to assert live outside QA's channel

**Status: recorded, not blocking. Same shape as `DEV-01`, and not raised as a question.**

Section 6.1 says the refusal reason strings *"are in section 1.1 and are part of the contract —
assert on them by value."* Section 6 is described at its own head as the only channel, so a pointer
out of it is either an extension of the channel or a gap in it. It was read as an extension, exactly
as `tests/unit/devices.test.ts` read the identical sentence on `DEV-01`, and `DUPLICATE_EMAIL`,
`NOT_FOUND` and `REFERENCED` are asserted by value.

### G-3 — `device-create-dialog` is not one of section 6.3's five, and is no longer used

Pass 2's AC-11 e2e test waited on `device-create-dialog` to know the device dialog had opened and
closed. Section 6.3 restates exactly five `DEV-01` selectors and that is not among them, and section
6 says a control absent from the table does not exist as far as QA is concerned.

**Corrected in place rather than raised**, because the channel already contains something that does
the job: `device-create-owner`, one of the five, is visible exactly when the dialog is open. No
question is asked of `tech-lead-design` because nothing is missing — the fifth selector was simply
being used where a sixth was reached for.

### No other gap

Every other selector these tests needed was in section 6. All 41 rows resolved, both prefixes from
the shared components behaved as documented, and none of the six notes under the table turned out to
be wrong: the two delete dialogs are distinct elements, the `-refused-seats` and `-refused-devices`
values render bare and always, the `-error` elements are absent until they are needed, the role
select carries an empty placeholder in both dialogs, the two case-differing rows of AC-3b are
separately addressable, and the sign-in cell reads `account` for the seeded members and `no account`
for every member this surface creates.
