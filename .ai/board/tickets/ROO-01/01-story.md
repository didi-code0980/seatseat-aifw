---
ticket: ROO-01
stage: SPEC
agent: ba
produced_at: 2026-08-21T09:41:00Z
inputs_read: [ .ai/board/tickets/ROO-01/ticket.yaml, .ai/board/tickets/ROO-01/99-questions.md, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/standards/rbac-and-security.md, .ai/standards/data-model.md ]
consulted:
  - with: human
    asked: "Deleting a room that contains seats — refuse, or delete destructively?"
    answer: "Delete destructively, with an explicit confirmation naming how many seats will be lost. Issued as INV-11 in .ai/registry/invariants.md."
    resulted_in_amendment: true
  - with: human
    asked: "AC-8 to AC-11 require a session and a role guard that do not exist (B1). Cut or block?"
    answer: "Cut. ROO-01 is Room CRUD against DATA_SOURCE=mock. The role guard moves to the AUT group and needs the Better Auth / Member ADR first."
    resulted_in_amendment: true
  - with: tech-lead-design
    asked: "Q1 — what does the create form collect, given code, gridWidth and gridHeight are required and non-nullable?"
    answer: "Resolution (a): the form carries all four fields. No schema change, no invented values."
    resulted_in_amendment: true
  - with: tech-lead-design
    asked: "Q2 — is the duplicate-code refusal an acceptance criterion?"
    answer: "Yes. AC-12."
    resulted_in_amendment: true
  - with: tech-lead-design
    asked: "Q3 — is a non-Admin refused by a message or a redirect?"
    answer: "Withdrawn. The criteria it asked about are cut from this ticket; the question belongs to the AUT ticket that implements the guard."
    resulted_in_amendment: true
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# ROO-01 — Room CRUD UI

Every acceptance criterion below derives from `.ai/registry/features.md`, `.ai/registry/invariants.md`,
and `ticket.yaml`. `glossary.md` supplied the meaning of *Room*; `data-model.md` supplied the
prohibition on inventing fields. No acceptance criterion originates in a tracker description
(RULE-17) or in `src/**` (RULE-05, never read — the four `Room` field names used below reached this
story through finding B2 in `02-design.md`, which is the channel that exists for exactly this).

**This story has been amended twice since it first passed SPEC.** The gate that judges it passed on
2026-08-12; DESIGN and REVIEW have passed since, and the ticket is at QA. `next_state` reads `QA`
because that is where the ticket is — this amendment answers questions from downstream stages under
RULE-14 and does not move it.

## Feature

Transcribed from the `ROO — Rooms` table of `.ai/registry/features.md` without paraphrase:

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| ROO-01 | Room CRUD UI | ROO | PLANNED | [] | Admin-only. First loop-validation slice. |

Two cells of that row are now out of date and only a human can correct them (RULE-01): the
`Invariants touched` cell reads `[]` where this story now records seven IDs, and `Admin-only` names a
guard this ticket no longer delivers. Both are listed under Open questions as H-1 and H-2. The row is
transcribed above as it stands, not as it should read.

## User value

An Admin gains the ability to create, see, rename, and remove the rooms the organization occupies. A
Room is *an organizational space containing seats* (glossary), which makes it the container every
other domain object is scoped by: a seat exists in a room, a layout is a room's grid, a seat request
names a room. Until an Admin can put rooms into the system there is nothing for seats, layouts, or
requests to attach to, and no other group of features can be exercised end to end. The registry also
marks this the *first loop-validation slice* — its second purpose is to measure whether the process
closes from BACKLOG to a pull request, which is why its domain surface is deliberately the smallest
one that is still a complete read and write path.

## Acceptance criteria

**This ticket runs against `DATA_SOURCE=mock` and enforces no role guard.** No session exists to read
a role from (finding B1 in `02-design.md`), so no criterion below has a role in its Given. That is a
deliberate, temporary state; see the Permissions section and out-of-scope item 5.

"Room management screen" means the surface this ticket delivers; DESIGN names its route. Each
criterion is observable from outside the system.

**AC-1 — The rooms that exist are listed**
- Given the system holds more than one room
- When I open the room management screen
- Then every room held by the system is listed, each identified by its name
- And a control to create a room is present

**AC-2 — A room is created from all four of its required fields**
- Given I am on the room management screen
- When I submit the create form with a non-blank name, a code not already in use, and a grid width
  and grid height that are both positive whole numbers
- Then the new room appears in the room list, identified by the name I submitted
- And the outcome is confirmed to me without my having to reload the page

**AC-3 — Creation is refused when a required field is missing or blank**
- Given I am on the create form
- When I submit with the name, or the code, empty or consisting only of whitespace, or with the grid
  width or grid height absent
- Then no room is created
- And a validation message is shown against each offending field
- And the room list is unchanged

**AC-4 — An existing room is renamed**
- Given a room exists
- When I edit that room and submit a different name that is not blank
- Then the list shows that room under its new name
- And the number of rooms is unchanged
- And that room's code, grid width, and grid height are unchanged

**AC-5 — A room that contains no seats is deleted**
- Given a room exists that contains no seats
- When I request its deletion
- Then a confirmation is presented, stating that no seats will be lost
- And when I confirm
- Then that room no longer appears in the room list
- And no other room is affected

**AC-6 — Deleting a room deletes its seats, after a confirmation naming how many (INV-11)**
- Given a room exists that contains at least one seat, and *N* is the number of seats it contains
- And the seeded room whose code is `ROOM-A` is such a room, with six seats
- When I request its deletion
- Then a confirmation is presented that names the number of seats that will be permanently lost, and
  that number is *N* — six for `ROOM-A`
- And at that point neither the room nor any seat has been deleted
- And when I confirm
- Then the room and all *N* of its seats are permanently deleted
- And the room no longer appears in the room list
- And the deletion cannot be undone from this surface

The count is written as *N* rather than as a literal because the assertion this criterion exists to
make is that **the number shown equals the number destroyed**. A literal asserts a fixture instead,
and a fixture is not what INV-11 constrains. `ROOM-A` and its six seats are named as the setup datum
QA is entitled to be told — QA cannot construct a room with seats, since seat creation is
out-of-scope item 1, and cannot look the number up, since `fixtures.ts` is `src/**` and RULE-05
closes that door. If the seed changes, *N* changes with it and this criterion still holds.

**AC-7 — Deletion is not performed until it is confirmed**
- Given a room exists that contains at least one seat
- When I request its deletion and then dismiss or cancel the confirmation
- Then the room still appears in the room list
- And every seat it contained still exists

**AC-12 — Creation is refused when the code is already in use**
- Given a room exists whose code is `R-101`
- When I submit the create form with the code `R-101` and an otherwise valid name, grid width, and
  grid height
- Then no room is created
- And a validation message is shown against the code, stating that the code is already in use
- And the room list is unchanged

**AC-13 — Creation is refused when a grid dimension is not a positive whole number**
- Given I am on the create form
- When I submit a grid width or a grid height that is zero, negative, or not a whole number
- Then no room is created
- And a validation message is shown against the offending dimension
- And the room list is unchanged

**AC-14 — Deleting a room does not delete devices (INV-07, INV-06)**
- Given the seeded room whose code is `ROOM-A` contains a seat to which the device `dev-01` is
  assigned as its primary device
- And the device `dev-04` is assigned to a seat in a different room
- When I delete `ROOM-A` and confirm
- Then `dev-01` still exists
- And `dev-01` is assigned to no seat
- And `dev-01` is not marked primary
- And `dev-04` is unchanged in every respect — still assigned to the same seat, with no field of
  it altered

`dev-01` and `dev-04` are named for the same reason `ROOM-A` is named in AC-6 and `R-101` in AC-12:
they are setup data, and this ticket builds no surface on which a device appears (out-of-scope item
7), so there is no selector through which QA could discover them. `dev-04` is the control. Without
it the criterion cannot distinguish a cascade that detaches the right devices from one that detaches
every device in the system, and that is the more damaging of the two failures.

The control asserts that **nothing** about `dev-04` moved, rather than naming the fields that must
not move. An earlier version of this clause named two — its seat and a primary rank — and the rank
half was wrong: no device in the seed is both primary and seated outside `ROOM-A`, so the clause
could not be satisfied by any device (Q12). Naming fields invites exactly that mistake, and it is
also the weaker assertion: a cascade that corrupted some third field would have passed it.

AC-3, AC-7, AC-12, AC-13, and the pre-confirmation clauses of AC-5 and AC-6 are the refusals. They
are stated as criteria rather than left implicit because an AC set that describes only success
describes half the behaviour, and the omitted half is where the invariants live.

**AC-8, AC-9, AC-10 and AC-11 were withdrawn** by the scope cut recorded in the Changelog. Their
numbers are retired and are not reused, so that a reference to `AC-10` written before the cut cannot
silently resolve to a different criterion. What they specified is out-of-scope item 5.

## Invariants touched

`[INV-01, INV-04, INV-05, INV-06, INV-07, INV-10, INV-11]`.

The previous version of this section recorded `[]`, and its reasoning was circular: it chose the
safest deletion behaviour, then concluded no invariant was engaged *because of that choice*. This
field records what the change could affect, not what survives its own mitigation. The list below is
reasoned from what the ticket now does — a destructive cascade and a create path that fixes a room's
grid.

**Engaged:**

- **INV-11** (deleting a room deletes its seats; destructive; confirmation must name the number of
  seats lost) — AC-6 is this invariant. It is the only invariant in the ledger that permits data loss
  rather than preventing it, and the confirmation is the whole of the guard.
- **INV-01** (a seat has at most one occupant) — the cascade destroys occupancy rows. A destroyed
  occupancy cannot make the invariant false, but the delete path is a write to the relation INV-01
  constrains, and a partial cascade that removed a seat while leaving its occupancy behind would
  break it. R8 has something real to check here.
- **INV-04** (at most one primary device per seat), **INV-05** (a primary device is owned by the
  seat's occupant), **INV-06** (primary downgrades when the occupant exits), **INV-07** (devices may
  exist unassigned) — deleting a seat is the most complete form of occupant exit there is, and a
  seat's devices have to go somewhere. AC-14 sends them to the state INV-07 explicitly permits:
  existing, unassigned, not primary. The alternative outcomes are a device deleted with the seat, or
  a device left pointing at a seat that no longer exists and still flagged primary, and the second
  violates INV-04 and INV-05 against a row that cannot be repaired because its seat is gone.
- **INV-10** (no two seats overlap within a room) — AC-2 and AC-13 fix the grid width and height at
  creation, and that grid is the coordinate space every later overlap test is evaluated in. This
  ticket places no seat and cannot itself produce an overlap, but a room created with a zero or
  negative dimension gives the Layout Designer a space in which no placement is well defined. AC-13
  is what keeps that out.

**Not engaged, having been reasoned through:**

- **INV-02** (one person may occupy multiple seats) — the invariant is the *absence* of a
  cardinality constraint. Deleting rows cannot make it false.
- **INV-03** (seat status is derived) — no status is read, written, or cached anywhere in this
  ticket, and nothing here adds a column or a seed.
- **INV-08** (no self-signup) — no account path exists here. The criterion that used to reference it
  was AC-11, which is withdrawn.

`INV-09` is unissued and cannot be touched by anything.

## Permissions

**This ticket enforces no permission gate, and that is a known gap rather than an omission.** Finding
B1 in `02-design.md` establishes that no session exists: Better Auth is configured without a database
adapter, the login page cannot produce a session, there is no `getSession` helper and no route guard,
and whether `Member` maps onto Better Auth's user table is an unmade decision needing an ADR
(RULE-09). A role cannot be read, so a rank comparison cannot be made.

Consequently, while this ticket is the current state of the code, **every room operation is reachable
by anyone who can reach the application.** That is the operator's accepted trade for validating the
loop against `DATA_SOURCE=mock`, and it is written here rather than left as a silence, because a
surface that looks guarded and is not is worse than one that is plainly ungated.

The permission model this surface is *intended* to have is recorded below for the AUT ticket that
will implement it. It is not implemented by ROO-01 and no criterion here asserts it.

| Actor | List rooms | Create | Rename | Delete | Reach the surface |
|---|---|---|---|---|---|
| `ADMIN` | yes | yes | yes | yes | yes |
| `MANAGER` | no | no | no | no | no |
| `USER` | no | no | no | no | no |
| Unauthenticated | no | no | no | no | no |

When that guard is built, it belongs in the server action on every operation, not only in the UI:
`PermissionGate` hides a control and does not protect an operation, and a hidden delete button over
an unchecked action is an open operation. That requirement travels with the withdrawn criteria to the
AUT group; it is stated here so it is not lost in the move.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Seats.** Creating, editing, deleting, or listing seats, and any seat table on the room screen.
   The only facts about seats this ticket establishes are the count shown in the deletion confirmation
   (AC-6, required by INV-11) and the destruction of those seats when the delete is confirmed. Goes to
   the `SEA` group.
2. **Layout and placement.** Seat placement, footprints, grid rendering, drag and drop, and any
   spatial view of a room. Goes to the `LAY` group. A room's grid *width and height* are collected on
   the create form (AC-2, AC-13) because the model requires them; they are not editable after
   creation (AC-4), and editing them is `LAY` work — changing a grid's size once seats are placed is
   an INV-10 question this ticket does not open.
3. **Any schema change.** This ticket writes no migration and changes no model. `schema_delta` is
   `none` and `requires_adr` is `false`. Both were briefly set otherwise, for two decisions that have
   since evaporated: the Better Auth / `Member` reconciliation existed only to make AC-8 to AC-11
   checkable and went with them in the scope cut, and the second was contingent on Q1 resolving to
   (b), which it did not. The INV-11 cascade needs no migration either — the schema already declares
   the seat-to-room cascade AC-6 wants and the device-to-seat `SetNull` AC-14 requires. If room CRUD
   turns out to be undeliverable without a migration, the ticket stops rather than acquiring one at
   DESIGN or IN_PROGRESS.
4. **Rooms on any other surface.** A room list on the dashboard, or a room picker inside a seat
   request. Goes to `DSH` and `REG` respectively.
5. **Sessions, roles, and the guard on this surface — including AC-8, AC-9, AC-10 and AC-11 as
   written.** A Manager being refused the surface, a User being refused the surface, every operation
   being refused server-side rather than only in the UI, and an unauthenticated request reaching
   nothing: all four go to the **`AUT` group**, together with sign-in, account creation, and role
   assignment. They cannot be specified against this ticket because the thing they check does not
   exist, and they must not be re-specified against a stubbed session — an AC-10 that passes against a
   role read from a cookie reports that authorization was verified when nothing was. The AUT work
   needs the Better Auth / `Member` ADR first. **No AUT ticket is created by this story;** adding the
   feature row and seeding the ticket is the human BACKLOG step (RULE-01).
6. **Room list ergonomics.** Search, filtering, sorting, pagination, bulk create or delete,
   import/export, archiving, and soft delete or restore. Soft delete is doubly out: INV-11 records
   that the operator considered it and chose a real delete. Each needs its own feature row.
7. **Devices, network ports, groups, and members.** Goes to `DEV`, `SEA` (ports belong to a seat),
   `GRP`, and `MEM`. The single exception is AC-14, which specifies only what happens to a device
   whose seat this ticket destroys — no device is created, edited, listed, or reassigned by hand.
   Two consequences of the INV-11 cascade are deliberately left without a criterion here, and both
   are stated rather than left silent:
   - **Network ports are destroyed with their seats, and that is intended.** A port belongs to a
     seat and is part of that seat's fixed physical description (glossary), and in the seam a port is
     a field of the seat rather than a row with an identity of its own. AC-6 already asserts the
     seats are gone, so a criterion asserting their ports are gone would assert the same fact twice
     and could not fail independently. This holds only while a port has no seam read path of its own;
     the day `SEA` gives ports one, this needs a criterion in AC-14's shape, because from then on a
     port could outlive its seat the way a device does.
   - **A seat request that named a destroyed seat is left naming it.** No invariant in the ledger
     has a seat request as its subject, and no criterion on this ticket reaches one. The mock
     therefore diverges from the schema, which declares `onDelete: SetNull` on the request's seat and
     would blank it: the divergence is recorded here so the `REG` group inherits it knowingly rather
     than discovering it the first time it runs against `DATA_SOURCE=prisma`. Reconciling the two is
     `REG` work and needs a feature row that does not exist yet.
8. **Tracker synchronization.** `sync_enabled` is false and the tracker is never on the critical path
   (RULE-10). `/sync-tracker` owns it.

## Open questions

Assumptions ship as written; each is falsifiable, and reversing one is an amendment to this story
(RULE-14). Items prefixed `H-` are for a human and are not blocking this artifact — they are registry
edits no agent may make (RULE-01).

- **A-1 — Room names need not be unique; room codes must be.** No registry statement requires name
  uniqueness, so creating a second room with an existing name succeeds under AC-2. Code uniqueness is
  not an assumption: `Room.code` is `@unique` in the model, reported as finding B3, and AC-12 now
  specifies the refusal.
- **A-2 — WITHDRAWN.** This assumption held that a room containing seats could not be deleted. The
  operator decided the opposite and the decision is now INV-11 in the registry, which outranks any
  assumption a story can make. AC-6 is inverted accordingly. The assumption is left here, struck,
  rather than deleted, because `02-design.md` section 0 and `99-questions.md` both cite it.
- **A-3 — The four `Room` fields are `name`, `code`, `gridWidth`, and `gridHeight`.** This story did
  not read `src/**` (RULE-05). Those names arrived through finding B2 in `02-design.md`, which
  transcribes them from `src/lib/data/types.ts` and the draft `prisma/schema.prisma`. No field beyond
  those four is named anywhere in this story, and their types, schemas, and form wiring remain the
  Tech Lead's under RULE-04.
- **A-4 — SUPERSEDED.** This assumption read the registry's "Admin-only" note as covering the read
  view as well as the write controls. It is moot for ROO-01, which enforces no guard at all, and it
  is the AUT ticket's to decide when the guard is specified. Recorded because the Permissions table
  above still reflects it.
- **A-5 — The create form collects all four fields (Q1 resolution (a)).** The alternative — a name
  alone, with defaults or nullability for the other three — is a schema change, which is an ADR and a
  human under RULE-09. Resolution (a) needs neither, and it invents no field value, which the
  alternative of generating a code inside the seam would have.
- **A-6 — A device on a destroyed seat survives, unassigned and not primary (AC-14).** INV-11 says
  what happens to seats and is silent on devices. INV-07 permits a device to exist unassigned, which
  is the only outcome consistent with the device ledger that does not destroy an owned asset as a
  side effect of a room delete. If the operator wants devices deleted with the room, that is a change
  to INV-11 or a new invariant, not a design decision.
- **H-1 — The `features.md` row for ROO-01 still reads `Invariants touched: []`.** It should name the
  seven IDs above. Registry, human-only.
- **H-2 — The same row still reads "Admin-only".** ROO-01 no longer delivers a guard. The note now
  describes the AUT work rather than this ticket. Registry, human-only.
- **H-3 — `invariants.md` still closes with "The next invariant issued will be `INV-11`."** INV-11 is
  issued, and that sentence now points at a row that exists. Registry, human-only.

## Changelog

- `2026-08-12T04:59:46Z` — initial version, all sections. Raised by `ba`. Amended by `ba`. No
  clarification was requested and `consulted` was empty.
- `2026-08-12T15:41:00Z` — sections *Acceptance criteria*, *Invariants touched*, *Permissions*,
  *Out of scope*, *Open questions*, and *Feature*. Raised by `tech-lead-design` (findings B1, B2, B3
  in `02-design.md`; Q1, Q2, Q3 in `99-questions.md`) and by a human (the INV-11 decision and the
  scope cut). Amended by `ba`. Six changes: **(1)** AC-6 inverted — deleting a room now destroys its
  seats behind a confirmation naming the count, per INV-11; assumption A-2 withdrawn. **(2)**
  `invariants_touched` corrected from `[]` to seven IDs, with the circular reasoning that produced
  `[]` replaced. **(3)** AC-2 and AC-3 amended to collect and validate `code`, `gridWidth` and
  `gridHeight`, resolving B2 by Q1 resolution (a); out-of-scope item 2 split so grid *dimensions* are
  in scope and grid *placement* is not. **(4)** AC-12 added for the duplicate-code refusal, resolving
  B3. **(5)** AC-8 to AC-11 withdrawn to out-of-scope item 5 and their numbers retired; the
  Permissions section rewritten to state that no guard is enforced. **(6)** AC-13 and AC-14 added —
  grid-dimension validation and device fallout — both consequences of (1) and (3) that would
  otherwise have been invented by the Developer. `size_estimate` re-checked and held at `M`.
- `2026-08-21T09:41:00Z` — sections *Acceptance criteria* (AC-6, AC-14), *Out of scope* (items 3 and
  7), and the front-matter note. Raised by `tech-lead-design` (Q6) and by `qa` (Q7, Q9) in
  `99-questions.md`; Q8 raised by `tech-lead-design` at the v3 design amendment. Amended by `ba`.
  Four changes: **(1)** AC-6's Given no longer names a three-seat room, which no fixture holds and
  which QA cannot build — the count is *N*, the assertion is that the number shown equals the number
  destroyed, and `ROOM-A` with its six seats is named as setup data (Q7, resolution (b) with the
  datum from (a)). **(2)** AC-14's Given names `ROOM-A` and `dev-01`, and adds `dev-04` as a control
  so the criterion can distinguish a correct cascade from one that detaches every device (Q9,
  resolution (a)). **(3)** Out-of-scope item 7 records two deliberate silences: network ports are
  destroyed with their seats and get no criterion, because in the seam a port is a field of a seat
  and AC-6 already asserts the seats are gone (Q6, resolution (b), with the condition that reverses
  it); and a seat request naming a destroyed seat is left dangling, with `REG` named as owner and the
  mock-versus-schema divergence written down (Q8, resolution (b)). **(4)** Out-of-scope item 3
  corrected — `schema_delta` is `none` and `requires_adr` is `false`; both decisions that put them
  otherwise have evaporated. No acceptance criterion was added or removed, no AC number was reused,
  and `invariants_touched` is unchanged: ports engage no invariant, and no invariant in the ledger
  has a seat request as its subject. `size_estimate` unchanged at `M` — nothing here adds a file.
- `2026-08-21T10:12:00Z` — section *Acceptance criteria* (AC-14). Raised by `qa` as Q12 in
  `99-questions.md`. Amended by `ba`. The control clause read "`dev-04` is unchanged — still assigned
  to its seat, still primary", and the rank half was wrong: `dev-04` is `SECONDARY`, and the only two
  devices that are both assigned and primary are `dev-01` and `dev-03`, which the cascade detaches, so
  no device in the seed could satisfy it. Resolution (a): the clause now asserts that `dev-04` is
  unchanged in every respect, with no field named. That removes the false fact and strengthens the
  assertion at the same time — naming fields is what let the error in, and it would also have passed a
  cascade that corrupted a field the clause did not name. The defect was mine, and it is Q7 and Q9's
  shape a third time: a Given asserting fixture state that no artifact reaching me disclosed. No AC
  added or removed, no number reused; `invariants_touched` and `size_estimate` unchanged.
