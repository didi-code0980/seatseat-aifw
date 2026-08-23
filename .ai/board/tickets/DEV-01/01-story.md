---
ticket: DEV-01
stage: SPEC
agent: ba
produced_at: 2026-08-23T06:53:48Z
inputs_read: [ .ai/board/tickets/DEV-01/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/registry/rules.md, .ai/standards/rbac-and-security.md, .ai/standards/data-model.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: READY
---

# DEV-01 — Device CRUD UI

Every acceptance criterion below derives from `.ai/registry/features.md`,
`.ai/registry/invariants.md`, and `ticket.yaml`. `glossary.md` supplied the meaning of *Device*,
*Primary device*, *Secondary device*, and *Occupant*; `rbac-and-security.md` supplied the intended
permission model; `data-model.md` supplied the prohibition on inventing field names and the seed
composition cited under Open questions. No acceptance criterion originates in a tracker description
(RULE-17) or in `src/**` (RULE-05, never read).

`next_state` reads `READY` because that is the state this story is written toward. **This story does
not put the ticket there.** DoR is the orchestrator's evaluation and the ticket is left at `SPEC`.

## Feature

Transcribed from the `DEV — Devices` table of `.ai/registry/features.md` without paraphrase:

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| DEV-01 | Device CRUD UI | DEV | PLANNED | INV-04, INV-05, INV-06, INV-07 | Second CRUD slice — tests whether the ROO-01 pattern transfers. Mock-backed. |

The row is transcribed as it stands. This story finds nothing in it that needs correcting: the four
invariant IDs are the four this story reasons through as engaged, and `Mock-backed` is accurate. No
`H-` item is raised against the registry by this story.

## User value

The registry's device ledger — INV-04 through INV-07 — describes an entire class of state that no
surface in the system can currently produce, inspect, or repair. A Device is *a piece of equipment
with an owner*, which *may be assigned to a seat or sit unassigned in inventory* (glossary), and the
one device designated *primary* for a seat *must be owned by that seat's occupant*. Until someone can
put a device into inventory, hand it to a seat, and say which of the devices on that seat is the
primary one, the organisation has no record of who holds which equipment, and INV-04 and INV-05
constrain a table nothing writes to.

The person who gains the capability is whoever manages equipment — a Manager or Admin across the
organisation, a User over their own devices (`rbac-and-security.md`). What they gain is the ability
to answer *where is this device and whose is it*, and to change the answer, which is the whole of
device management and the precondition for every later feature that reads a device.

`ROO-01` reached these four invariants only through a cascade: deleting a room destroyed seats, which
detached devices, which was the first and only time INV-04 to INV-07 were exercised. **DEV-01 is the
ticket where they become enforced rules on a write path a person drives directly**, rather than a
consequence of destroying something else. That is its second purpose, and it is why the registry
marks it the slice that tests whether the ROO-01 pattern transfers.

## Acceptance criteria

**This ticket runs against `DATA_SOURCE=mock` and enforces no role guard.** The `AUT — Authentication
& Accounts` table in `.ai/registry/features.md` is empty, so no authentication feature has been
specified, no session exists to read a role from, and a rank comparison cannot be made. No criterion
below has a role in its Given. See the Permissions section and out-of-scope item 1.

"Device management screen" means the surface this ticket delivers; DESIGN names its route. Every
criterion below is observable from outside the system.

**A note on setup data, written because ROO-01 got this wrong three times.** This ticket builds no
way to create a seat, and no way to give a seat an occupant — both are out-of-scope items 2. The
criteria that turn on occupancy (AC-7 through AC-11) therefore cannot construct their own Given, and
under RULE-05 QA cannot look the seed up either. AC-1 resolves this by requiring the surface to
*display* the occupant of the seat a device is assigned to, and the seats available to assign to. The
relationship INV-05 constrains is then discoverable from the screen itself, and no criterion below
asserts a fixture fact that no artifact reaching QA has disclosed.

### Read

**AC-1 — Devices are listed with everything the invariants turn on**
- Given the system holds at least one device assigned to a seat and at least one device that is
  unassigned
- When I open the device management screen
- Then every device held by the system is listed
- And each listed device shows its owner
- And each listed device shows either the seat it is assigned to, or that it is unassigned
- And each device that is assigned to a seat shows whether it is that seat's primary device or a
  secondary device
- And each device that is assigned to a seat shows the current occupant of that seat, or that the
  seat has no occupant
- And a control to create a device is present

The occupant clause is not display polish. INV-05 makes a primary designation legal or illegal
according to a fact about the seat, and a person cannot make that designation correctly against a
screen that hides the fact. It is also what makes AC-7, AC-8, and AC-10 testable without disclosing
the seed.

### Create

**AC-2 — A device is created into unassigned inventory**
- Given I am on the device management screen
- When I submit the create form with every required field of a device supplied and valid, including
  an owner chosen from the members the system holds
- Then the new device appears in the device list, owned by the member I chose
- And it is shown as unassigned
- And it is not shown as a primary device
- And the outcome is confirmed to me without my having to reload the page

**AC-3 — Creation is refused when a required field is missing or blank**
- Given I am on the create form
- When I submit with any required field empty, consisting only of whitespace, or with no owner chosen
- Then no device is created
- And a validation message is shown against each offending field
- And the device list is unchanged

### Update — attributes

**AC-4 — An existing device's attributes are changed**
- Given a device exists
- When I edit that device and submit a different, valid value for one of its editable fields
- Then the list shows that device with the new value
- And the number of devices is unchanged
- And that device's seat assignment is unchanged
- And that device's primary or secondary designation is unchanged

**AC-11 — Changing a device's owner is refused while that device is a seat's primary device and the
new owner is not that seat's occupant (INV-05)**
- Given a device is the primary device of a seat, and that seat has an occupant
- When I edit that device and submit an owner who is not that seat's current occupant
- Then the owner is not changed
- And a validation message is shown against the owner, stating that a seat's primary device must be
  owned by that seat's occupant
- And the device is still that seat's primary device, owned by the occupant

This criterion exists because it is the second way into the same illegal state as AC-8, and it is the
one a Developer is likely to miss: AC-8 guards the designation while the owner is held still, AC-11
guards the owner while the designation is held still. A system that enforces only the first can be
walked into an INV-05 violation in two moves.

### Update — assignment

**AC-5 — An unassigned device is assigned to a seat, and lands as secondary (INV-04)**
- Given a device is unassigned
- When I assign it to a seat
- Then the list shows that device assigned to that seat
- And it is shown as a secondary device, not as that seat's primary device
- And its owner is unchanged
- And any device that was already the primary device of that seat is still that seat's primary device

Assignment does not confer primacy. If it did, assigning a second device to a seat would either
produce two primary devices, violating INV-04, or silently demote the existing one, which is a
consequence no invariant asks for and which a person would not expect from an action named *assign*.
Designating a primary is AC-7, and it is deliberately a separate act.

**AC-6 — A device is unassigned from its seat and returns to inventory (INV-07, INV-04)**
- Given a device is assigned to a seat
- When I unassign it
- Then the list shows that device as unassigned
- And it is not shown as a primary device of any seat
- And its owner is unchanged
- And it still exists
- And no other device changes its seat, its owner, or its primary or secondary designation

The clause about primacy applies whether or not the device was the seat's primary device before the
unassign, and it is the criterion that stops a primary designation outliving the assignment it was
made against. A device flagged primary while assigned to no seat is a row INV-04 and INV-05 cannot
be evaluated against at all.

### Update — primary designation

**AC-7 — An assigned device is designated its seat's primary device (INV-04, INV-05)**
- Given a device is assigned to a seat, and the seat's current occupant is that device's owner
- When I designate it as that seat's primary device
- Then the list shows that device as that seat's primary device
- And any device that was that seat's primary device before is now shown as a secondary device of
  that seat
- And that other device is still assigned to that seat, and its owner is unchanged
- And no device on any other seat changes its designation

The demotion clause is INV-04 stated as a behaviour. A designation that adds a second primary rather
than replacing the first is the exact violation the partial unique index in `.ai/standards/data-model.md`
is drafted to refuse, and it must be refused before it reaches the database, not by it — the mock has
no index.

**AC-8 — Designation as primary is refused when the device's owner is not the seat's occupant
(INV-05)**
- Given a device is assigned to a seat, and that seat has an occupant who is not that device's owner
- When I attempt to designate it as that seat's primary device
- Then it is not designated primary
- And a message states that a seat's primary device must be owned by that seat's occupant
- And whichever device was that seat's primary device, if any, is unchanged
- And no device changes its owner, its seat, or its designation

**AC-9 — Designation as primary is refused for a device that is assigned to no seat (INV-04, INV-05)**
- Given a device is unassigned
- When I attempt to designate it as a primary device
- Then it is not designated primary
- And it is still shown as unassigned
- And the device list is otherwise unchanged

A primary device is *the one device designated primary for a seat* (glossary). There is no such thing
as a primary device without a seat, and INV-05 cannot be evaluated for one — there is no occupant to
compare its owner against.

**AC-10 — Designation as primary is refused when the seat has no occupant (INV-05)**
- Given a device is assigned to a seat, and that seat has no occupant
- When I attempt to designate it as that seat's primary device
- Then it is not designated primary
- And a message states that a seat with no occupant can have no primary device
- And the device is still assigned to that seat, as a secondary device

This is separated from AC-8 rather than folded into it because the two Givens are different states,
and the second is where the defect lives: *the owner does not match the occupant* and *there is no
occupant to match* are the same refusal only if the comparison is written to treat an absent occupant
as a non-match. Written the other way round — an absent occupant compares equal, or the comparison is
skipped — AC-8 passes and this one fails, and the system permits a primary device on an empty seat.

### Delete

**AC-12 — A device in inventory is deleted**
- Given a device is unassigned
- When I request its deletion
- Then a confirmation is presented
- And at that point the device has not been deleted
- And when I confirm
- Then that device no longer appears in the device list
- And no other device is affected

**AC-13 — A device assigned to a seat is deleted, and the confirmation names the seat (INV-04)**
- Given a device is assigned to a seat, and that device is that seat's primary device
- When I request its deletion
- Then a confirmation is presented that names the seat the device is assigned to
- And at that point the device has not been deleted and the seat is unchanged
- And when I confirm
- Then that device no longer appears in the device list
- And that seat has no primary device
- And every other device assigned to that seat is unchanged — still assigned to that seat, with its
  owner and its secondary designation intact
- And the seat itself still exists, with its occupant unchanged

Deleting a seat's primary device leaves the seat with none, and that is legal: INV-04 sets a maximum
of one, not a minimum. The clause about the other devices on the seat is the control, in the shape
AC-14 of `ROO-01` eventually took — without it the criterion cannot distinguish a delete that removes
one device from one that removes or demotes every device on the seat, and the second is the more
damaging failure. Nothing about the seat's occupancy is touched: deleting a device is not an occupant
exit, so INV-06 does not fire here.

**AC-14 — Deletion is not performed until it is confirmed**
- Given a device exists
- When I request its deletion and then dismiss or cancel the confirmation
- Then the device still appears in the device list
- And its owner, its seat assignment, and its primary or secondary designation are unchanged

### The refusals

AC-3, AC-8, AC-9, AC-10, AC-11, AC-14, and the pre-confirmation clauses of AC-12 and AC-13 are the
refusals. They are stated as criteria rather than left implicit because an AC set that describes only
success describes half the behaviour, and the omitted half is where the invariants live. Four of the
eight are INV-04 or INV-05 stated as a behaviour, which is the entire reason this ticket carries those
IDs.

No AC number is retired on this ticket. AC-1 to AC-14 are all live.

## Invariants touched

`[INV-04, INV-05, INV-06, INV-07]` — matching the `features.md` row and the value already in
`ticket.yaml`, which this story confirms rather than changes.

The list records what this change **could** affect, not what survives the mitigation. AC-8, AC-10 and
AC-11 exist *because* an invariant was in play; concluding from their presence that it no longer is
would be the circular reasoning `.ai/registry/invariants.md` warns against, and the reasoning that
made `ROO-01` record `[]` on its first pass.

**Engaged:**

- **INV-04** (a seat has at most one primary device) — AC-7 is this invariant as a write path: the
  designation must demote the incumbent rather than sit alongside it. AC-5 keeps assignment from
  producing a second primary by a side door, AC-6 keeps a primary flag from surviving the loss of the
  seat it was made against, and AC-9 keeps one from existing without a seat at all. The mock has no
  partial unique index, so in this ticket the invariant is held entirely by the seam.
- **INV-05** (a seat's primary device must be owned by that seat's occupant) — reached from both
  sides. AC-8 and AC-10 guard the designation with the owner held still; AC-11 guards the owner with
  the designation held still. AC-7's Given is the only state in which the designation is legal. The
  registry records that this invariant is not expressible in Prisma and needs a constraint trigger;
  no such mechanism exists under `DATA_SOURCE=mock`, which makes the seam the only thing holding it
  here and makes review check R8 the only thing verifying that.
- **INV-06** (when an occupant exits a seat, that seat's primary device auto-downgrades to secondary)
  — engaged in one direction only, and the direction matters. **This ticket builds no occupant-exit
  path**; occupancy is written by `SEA` and `REG`, and out-of-scope items 2 and 7 say so. What
  DEV-01 can do is make the downgrade impossible or meaningless — by holding a device's primary
  designation somewhere that an occupant exit will not reach it, or by permitting a designation on
  a seat whose occupancy state the downgrade path does not consider. AC-6 and AC-10 are what keep
  that from happening. The registry's own note on INV-06 is that it *describes a write path that
  must exist, and a write path that does not exist is not caught by a constraint that is never
  evaluated* — DEV-01 is the ticket that creates the state that path will have to operate on.
- **INV-07** (devices may exist unassigned in inventory) — AC-2 makes inventory the state a device is
  born into, and AC-6 makes it the state a device returns to. This is the invariant that decides that
  unassigning is not deleting, and it is the reason AC-6 asserts *it still exists* rather than
  treating the removal from a seat as the removal of the device.

**Not engaged, having been reasoned through:**

- **INV-01** (a seat has at most one occupant) — this ticket reads a seat's occupant, to evaluate
  INV-05, and writes no occupancy at all. A read cannot make a cardinality constraint false.
- **INV-02** (one person may occupy multiple seats) — the invariant is the *absence* of a constraint,
  and nothing here adds one. A person owning several devices on several seats is exactly what INV-02
  permits and what AC-7 assumes.
- **INV-03** (seat status is derived, never stored) — AC-1 requires a seat's occupant to be displayed,
  which is adjacent to this invariant without engaging it: reading a derived value is what deriving is
  for. It would become engaged the moment the device surface *stored* an occupancy or status value of
  its own to avoid the query, and it does not; out-of-scope item 2 forbids writing anything on a seat.
  Stated rather than omitted, because a cache added at IN_PROGRESS to make the list render faster is
  precisely how this invariant gets broken by a ticket that never intended to touch it.
- **INV-08** (no self-signup) — no account path exists here. Owners are chosen from members that
  already exist (AC-2); out-of-scope item 4 forbids creating one.
- **INV-10** (no two seats overlap within a room) — this ticket places no seat and reads no grid
  coordinate.
- **INV-11** (deleting a room deletes its seats, behind a confirmation naming the count) — no room is
  reachable from this surface. The reverse direction is `ROO-01`'s and is already specified there: its
  AC-14 says what happens to a device when the cascade reaches it. Nothing in DEV-01 changes that.

`INV-09` is unissued and cannot be touched by anything.

## Permissions

**This ticket enforces no permission gate, and that is a known gap rather than an omission.** The
`AUT — Authentication & Accounts` table in `.ai/registry/features.md` is empty: no authentication
feature has been specified, so there is no session, no role to read, and no rank to compare. `ROO-01`
shipped under the same condition and recorded it the same way.

Consequently, while this ticket is the current state of the code, **every device operation is
reachable by anyone who can reach the application.** That is the operator's accepted trade for
validating the loop against `DATA_SOURCE=mock`, and it is written here rather than left as a silence,
because a surface that looks guarded and is not is worse than one that is plainly ungated.

The permission model this surface is *intended* to have is recorded below for the `AUT` ticket that
will implement it. It is not implemented by DEV-01 and no criterion here asserts it. It is transcribed
from the role scopes in `.ai/standards/rbac-and-security.md` — *Manager: manage accounts, members, and
devices*; *User: manage their own devices*.

| Actor | See the surface | List all devices | List own devices | Create | Edit | Assign / unassign | Designate primary | Delete |
|---|---|---|---|---|---|---|---|---|
| `ADMIN` | yes | yes | yes | yes | any | any | any | any |
| `MANAGER` | yes | yes | yes | yes | any | any | any | any |
| `USER` | yes | no | own only | own only | own only | own only | own only | own only |
| Unauthenticated | no | no | no | no | no | no | no | no |

`USER` is the row that is not a rank comparison alone. `rbac-and-security.md` is explicit that
*manage their own devices* is a rank check **plus an ownership check** — rank permits a User to reach
the device endpoint at all, ownership decides which rows — and that both belong in the same place. A
User acting on a device they do not own must be refused by the same mechanism that refuses an
unauthenticated caller, not by a filtered list: a list that omits a row is not a check, because the
action can be invoked without the list.

When that guard is built it belongs in the server action on every one of the eight operations above,
not only in the UI. `PermissionGate` hides a control and does not protect an operation, and a hidden
delete button over an unchecked action is an open operation. That requirement travels to the `AUT`
group with out-of-scope item 1; it is stated here so it is not lost in the move.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Sessions, roles, and any guard on this surface.** Sign-in, account creation, role assignment,
   the rank check, and the ownership check that the `USER` row above needs: all go to the **`AUT`
   group**, which has no feature row and no ticket. They cannot be specified against this ticket
   because the thing they check does not exist, and they must not be specified against a stubbed
   session — a criterion that passes against a role read from a cookie reports that authorization was
   verified when nothing was. **No `AUT` ticket is created by this story;** adding the feature row is
   the human BACKLOG step (RULE-01).
2. **Seats and occupancy.** Creating, editing, deleting, or placing a seat; assigning an occupant to a
   seat; releasing one. This ticket **reads** a seat's identity and its current occupant, because
   INV-05 is not evaluable without them, and **writes nothing on a seat**. Seats go to the `SEA`
   group; occupancy and self-release go to `SEA` and `REG`. A device surface that grows a *change the
   occupant* control has left this ticket.
3. **Network ports.** A port belongs to a seat and is part of that seat's fixed physical description
   (glossary), not to a device. No port is shown, created, or edited here. Goes to `SEA`.
4. **Members.** Creating, editing, deleting, or listing members as a surface of their own. An owner is
   chosen from the members the system already holds (AC-2); no member is created, and the
   member-facing UI goes to the `MEM` group, which has no feature row.
5. **Any schema change.** This ticket writes no migration and changes no model. `schema_delta` is
   `none` and `requires_adr` is `false`, and both stay that way. If device CRUD turns out to be
   undeliverable without a migration, the ticket stops rather than acquiring one at DESIGN or
   IN_PROGRESS.
6. **The database-level mechanisms for INV-04 and INV-05.** The partial unique index
   `one_primary_device_per_seat` and the constraint trigger for INV-05 are sketched in
   `.ai/standards/data-model.md` and are a schema change, which is human and needs an ADR (RULE-09).
   Under `DATA_SOURCE=mock` there is no database to hold them. In this ticket both invariants are held
   in `src/lib/data/` and nowhere else, which is weaker than a constraint, and the weakness is stated
   here rather than hidden. Applying them belongs to the ticket that applies the schema.
7. **INV-06's occupant-exit write path.** The downgrade that fires when an occupant leaves a seat is
   triggered by an occupancy write, and this ticket makes none. It belongs to whichever `SEA` or `REG`
   ticket ends occupancy. DEV-01's obligation to INV-06 is negative and is discharged by AC-6 and
   AC-10: do not create a state in which the downgrade cannot find the designation, or has nothing
   coherent to downgrade.
8. **Devices on any other surface.** A device count on the dashboard, a device panel on a seat, a
   device layer in the Layout Designer, a *my devices* view for a signed-in user. Go to `DSH`, `SEA`,
   `LAY`, and `AUT` respectively. Each needs its own feature row.
9. **Device list ergonomics.** Search, filtering, sorting, pagination, bulk assign, bulk delete,
   import and export, archiving, and soft delete or restore. AC-12 and AC-13 specify a real delete.
   Each of these needs its own feature row.
10. **Device history.** Who held a device before, when it moved seats, when it was promoted or
    demoted. No invariant in the ledger has device history as its subject and no registry statement
    requires it. It is named here because *where has this device been* is the first question anyone
    asks of a device register, and the answer for DEV-01 is that the system does not record it.
11. **Tracker synchronization.** `sync_enabled` is false and the tracker is never on the critical
    path (RULE-10). `/sync-tracker` owns it.

## Open questions

Assumptions ship as written; each is falsifiable, and reversing one is an amendment to this story
(RULE-14). Nothing in this section blocks SPEC. Items prefixed `Q-` are questions this story cannot
answer from the registry and expects a downstream stage to answer through the clarification channel.

- **A-1 — Creation always lands a device in unassigned inventory; assignment is a separate act
  (AC-2, AC-5).** The alternative — a create form that also takes a seat — collapses two writes into
  one and puts the INV-04 and INV-05 checks on a path where the device does not yet exist. Splitting
  them puts every invariant check on exactly one operation, which is also what makes AC-5 and AC-7
  independently testable. If DESIGN finds the split produces a form that cannot express a real
  workflow, that is an amendment here, not a decision there.
- **A-2 — A device's delete is confirmed before it is performed (AC-12, AC-13, AC-14).** No invariant
  requires this. INV-11 requires a confirmation for a *room* delete and says nothing about devices, and
  a device delete destroys one row rather than a room's occupancy history. The confirmation is asserted
  as an acceptance criterion on the ordinary grounds that a destructive action reached by one click is
  a mis-click away from data loss, and it is recorded as an assumption rather than an invariant so that
  a decision to drop it is visible as a decision.
- **A-3 — Device names are not required to be unique.** No registry statement requires it, so nothing
  in AC-2 or AC-3 refuses a duplicate. This is the assumption `ROO-01` made as its A-1 and had
  corrected by a `@unique` on `Room.code` that the story could not see. If any field of a device
  carries a uniqueness constraint in the model, AC-3 is incomplete and needs the refusal criterion that
  `ROO-01` eventually added as its AC-12. **DESIGN is expected to check this and raise it.**
- **A-4 — An owner is a member the system already holds, chosen rather than typed (AC-2).** The
  glossary defines a Device as having an owner and a Member as a person recorded in the system, and
  INV-08 forbids any path that creates an account outside Manager or Admin action. Typing a free-text
  owner would either invent a member or record a person the system does not hold; neither is
  acceptable, and out-of-scope item 4 forbids creating one here.
- **A-5 — The seeded data contains at least one seat with no occupant, and at least one seat whose
  occupant owns a device assigned to that seat.** AC-10 needs the first and AC-7 needs the second.
  `.ai/standards/data-model.md` records the seed as 2 rooms, about 12 seats, 3 members, and 5
  devices — 2 primary, 2 secondary, 1 unassigned. Two primary devices exist, and INV-05 makes each of
  them owned by its seat's occupant, so the second half is safe. The first half follows from three
  members across twelve seats, but it is an inference from counts and not a fact this story has read.
  If no unoccupied seat exists, AC-10 has no Given and this story must be amended, not worked around.
- **Q-1 — What are a device's required fields?** This story did not read `src/**` (RULE-05) and no
  document in the registry or the standards names a field of a device.
  `.ai/standards/data-model.md` states plainly that it *contains no field names* and that inventing
  them is prohibited; the raw SQL it sketches names `"Device"."seatId"` and `"isPrimary"` under a
  `TODO(verify):` that says they came from the bootstrap specification rather than an approved schema.
  AC-2, AC-3 and AC-4 are therefore written against *every required field* rather than a list. This is
  the same gap `ROO-01` hit, where the four `Room` field names reached the story through finding B2 in
  `02-design.md`. **DESIGN is expected to transcribe the device's field set as a finding and raise it
  with `ba`**, which amends AC-2, AC-3 and AC-4 under RULE-14. It does not block this stage: the
  criteria are correct as written and become more specific, not different, when the answer arrives.
- **Q-2 — Is the assign-to-a-seat control a seat picker over every seat in the system?** AC-5 says a
  device is assigned to a seat and does not say how the seat is chosen. With about twelve seats a flat
  picker is adequate; the question is whether it must be scoped by room, which would make AC-1's
  occupant display and AC-5's picker both room-aware and is a materially larger surface. This story's
  position is that it must not be scoped by room in DEV-01 — scoping is list ergonomics, which is
  out-of-scope item 9 — but the choice affects `size` and is DESIGN's to confirm.

## Changelog

- `2026-08-23T06:53:48Z` — initial version, all sections. Raised by `ba`. Amended by `ba`. No
  clarification was requested and `consulted` is empty. `invariants_touched` written as
  `[INV-04, INV-05, INV-06, INV-07]`, confirming the value seeded into `ticket.yaml` from the
  `features.md` row rather than changing it, with per-ID reasoning for all four engaged and for the
  six reasoned and found not engaged. `size_estimate` written as `M`.
- `2026-08-23T07:09:56Z` — section `Invariants touched`, the INV-06 bullet: the cross-reference
  `out-of-scope item 8` corrected to `out-of-scope items 2 and 7`. Item 8 is *Devices on any other
  surface*; the items that place occupancy with `SEA` and `REG` and place INV-06's occupant-exit
  write path outside this ticket are 2 and 7, and the header comment in `ticket.yaml` already cited
  7. Found by `ba` re-deriving the story from the registry on a second `/spec DEV-01`, not by a
  clarification; `consulted` stays empty. No acceptance criterion, no invariant ID, and no
  `size_estimate` changed — the SPEC gate recorded at `2026-08-23T06:53:48Z` is unaffected. Raised
  by `ba`. Amended by `ba`.
