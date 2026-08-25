---
ticket: SEA-01
stage: SPEC
agent: ba
produced_at: 2026-08-24T01:47:19Z
inputs_read: [ .ai/board/tickets/SEA-01/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/registry/rules.md, .ai/standards/rbac-and-security.md, .ai/standards/data-model.md, .ai/board/tickets/ROO-01/01-story.md, .ai/board/tickets/DEV-01/01-story.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: READY
---

# SEA-01 — Seat occupancy — assign and release

Every acceptance criterion below derives from `.ai/registry/features.md`,
`.ai/registry/invariants.md`, and `ticket.yaml`. `glossary.md` supplied the meaning of *Seat*,
*Occupant*, *Primary device*, *Secondary device*, and *Self-release*; `rbac-and-security.md` supplied
the intended permission model; `data-model.md` supplied the prohibition on inventing field names and
the seed composition cited under Open questions. Two board-plane artifacts are cited as the channel
through which facts about the seeded fixture legitimately reach a story that may not read `src/**` —
`ROO-01/01-story.md` (AC-6, AC-14, and the Q12 amendment) and `DEV-01/01-story.md` (out-of-scope
items 2 and 7, assumption A-5). No acceptance criterion originates in a tracker description
(RULE-17) or in `src/**` (RULE-05, never read).

`next_state` reads `READY` because that is the state this story is written toward. **This story does
not put the ticket there.** DoR is the orchestrator's evaluation and the ticket is left at `SPEC`.

## The scope question, settled

`ticket.yaml` names one question SPEC must answer before DESIGN, because the answer decides which
group owns the ticket:

> Does SEA-01 include seat **placement** — creating a seat at a grid coordinate with a footprint?

**No. This ticket is assignment and release only, and it stays a `SEA` ticket.** Placement, INV-10,
and everything spatial go to the `LAY` group as out-of-scope item 1.

Three reasons, in the order they bind:

1. **The registry row already says so.** The `SEA-01` row in `.ai/registry/features.md` reads
   *Placement is deliberately out of this row*, and lists `INV-01, INV-02, INV-03, INV-06` — INV-10
   is absent. That row is the only valid source of feature IDs (RULE-17) and a BA does not widen it.
2. **`data-model.md` assigns INV-10 elsewhere.** *Every LAY ticket lists INV-10 in
   `invariants_touched`*, so a ticket carrying INV-10 is a LAY ticket by construction. Pulling
   placement in would not make this a bigger SEA ticket; it would make it a LAY ticket wearing a SEA
   prefix, and the group prefix is what routes it.
3. **The two are different domain acts on different data.** Placement is where a seat *is* —
   `gridX`, `gridY`, `gridW`, `gridH`, four numbers checked pairwise against every other seat in the
   room. Occupancy is who *sits* there. A seat that has never been placed can still be assigned an
   occupant, and a seat that is placed and empty is still placed. Neither operation reads the other's
   fields.

The registry's own note gives the fourth reason and it is the strongest of the four: INV-10 is *the
failure dnd-kit produces most easily and the eye catches least reliably*. An invariant with that
property earns a ticket where it is the subject, not a ticket where it is the seventh bullet.

**Consequence for `invariants_touched`:** INV-10 is not on the list, and the *Invariants touched*
section below reasons it through explicitly rather than omitting it silently. If a human reverses
this decision, INV-10 joins the list, the row moves to `LAY`, and this story is amended under
RULE-14 rather than reinterpreted.

## Feature

Transcribed from the `SEA — Seats` table of `.ai/registry/features.md` without paraphrase:

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| SEA-01 | Seat occupancy — assign and release | SEA | PLANNED | INV-01, INV-02, INV-03, INV-06 | Fourth slice, specced parallel to MEM-01's implementation. **Placement is deliberately out of this row**: INV-10 governs grid overlap, and `types.ts:77` assigns it to every LAY ticket. SPEC must confirm the split before DESIGN — if placement is pulled in, INV-10 joins this list and the ticket becomes LAY's problem instead. INV-06 is the reason this ticket writes `mock/devices.ts`: releasing an occupant auto-downgrades that seat's primary device. |

The row is transcribed as it stands. One cell is now narrower than what this story reasons: the
`Invariants touched` cell lists four IDs and this story records seven. That is a registry edit and
it is raised as `H-1` under Open questions rather than made here (RULE-01). The row's `Notes` are
accurate in every other respect, and its instruction to settle the placement split has been carried
out in the section above.

## User value

Every other feature in this system is scoped by a room and pointed at a seat, and until now nothing
can put a person in one. `ROO-01` created rooms and destroyed them. `DEV-01` created devices, moved
them between seats, and designated a seat's primary device — and it could only do so by *reading* a
seat's occupant, because INV-05 is not evaluable without one. It had no way to produce that occupant.
The seeded fixture is currently the only source of occupancy in the system, which means the entire
device ledger — INV-04 through INV-07 — is exercisable only against states someone wrote by hand into
a fixture file.

This ticket closes that. A Manager gains the ability to put a person in a seat and take them out
again, which is the smallest complete occupancy path and the one that turns four invariants from
fixture data into behaviour. It is also the ticket where **INV-06 becomes code for the first time.**
The invariants ledger is explicit that INV-06 *describes a write path that must exist, and a write
path that does not exist is not caught by a constraint that is never evaluated* — and `DEV-01`
recorded, as its out-of-scope item 7, that it makes no occupancy write and therefore cannot build
that path. SEA-01 is the ticket that ends occupancy, so SEA-01 is the ticket that owes the downgrade.

## Acceptance criteria

**This ticket runs against `DATA_SOURCE=mock` and enforces no role guard**, for the same reason
`ROO-01` and `DEV-01` did: the `AUT — Authentication & Accounts` table in `.ai/registry/features.md`
is empty, so there is no session and no role to read. No criterion below has a role in its Given. See
the Permissions section and out-of-scope item 5.

"Seat occupancy screen" means the surface this ticket delivers; DESIGN names its route. Each
criterion is observable from outside the system.

**AC-1 — Seats are listed with their occupant and their status**
- Given the system holds seats, at least one with an occupant and at least one without
- When I open the seat occupancy screen
- Then every seat the system holds within the scope of that screen is listed, each identified by the
  seat identifier the surface displays
- And each seat that has an occupant shows that occupant, identified by name
- And each seat that has no occupant is shown as having none
- And each seat shows a status that agrees with whether it has an occupant
- And a control to assign an occupant is present on each seat that has no occupant
- And a control to release the occupant is present on each seat that has one

**AC-2 — An occupant is assigned to a seat that has none**
- Given a seat with no occupant, and a member the system already holds
- When I assign that member to that seat
- Then that seat's occupant is that member
- And that seat's status shows it occupied, without my having to reload the page
- And no other seat's occupant changes
- And no member is created

**AC-3 — Assignment is refused when the seat already has an occupant (INV-01)**
- Given a seat whose occupant is member A
- When the assign operation is invoked for that seat naming member B
- Then no assignment is made
- And that seat's occupant is still member A
- And a message states that the seat is already occupied
- And member B occupies no seat they did not already occupy

The Given is reachable even though AC-1 puts the assign control only on seats that have no occupant,
and that is the point of the criterion: **the refusal belongs to the operation, not to the absence of
a control.** `rbac-and-security.md` states the general form — a UI that hides a control while the
action does not check is an open endpoint with a hidden button — and INV-01 is exactly the kind of
constraint that gets left to a hidden control. Two clients racing on the same free seat reach this
path with no hidden button involved.

**AC-4 — One person may occupy more than one seat (INV-02)**
- Given member A occupies seat S1
- And seat S2 has no occupant
- When I assign member A to S2
- Then member A occupies both S1 and S2
- And S1's occupant is unchanged
- And S1's status still shows it occupied
- And no message refuses the assignment

INV-02 is the absence of a cardinality constraint, so the only way to observe it is to do the thing a
wrongly-added constraint would refuse. This criterion exists because *one seat per person* is the
assumption a reader brings to an occupancy feature, and it is wrong here.

**AC-5 — An occupant is released from a seat**
- Given a seat whose occupant is member A
- When I release that seat
- Then that seat has no occupant
- And that seat's status shows it free, without my having to reload the page
- And member A still exists
- And member A's other seats, if any, are unchanged
- And no other seat's occupant changes

**AC-6 — Releasing an occupant downgrades that seat's primary device to secondary (INV-06)**
- Given a seat that has an occupant, and a device assigned to that seat and designated that seat's
  primary device
- And the seeded device `dev-01` is such a device, assigned to a seat in the room whose code is
  `ROOM-A`
- When I release that seat
- Then that seat has no occupant
- And `dev-01` is no longer that seat's primary device — it is secondary
- And `dev-01` is still assigned to that same seat
- And `dev-01` still exists and its owner is unchanged
- And that seat has no primary device

`dev-01` is named for the same reason `ROOM-A` is named in `ROO-01`'s AC-6: it is setup data, and QA
can neither look it up (`fixtures.ts` is `src/**`, and RULE-05 closes that door) nor construct it,
because designating a primary device is `DEV-01`'s surface and creating a seat is out-of-scope item 2.
The fact that `dev-01` is assigned and primary within `ROOM-A` is established by `ROO-01`'s AC-14 and
by the Q12 amendment recorded in that story's changelog. It is carried here as assumption A-5, which
is falsifiable: if no seeded seat has both an occupant and a primary device, this criterion has no
Given and **this story is amended, not worked around.**

The criterion asserts the downgrade *and* the two things the downgrade must not become — a deletion
and a detachment. INV-06 says the primary device becomes secondary. It does not say the device leaves
the seat, and it does not say the device leaves the system.

**AC-7 — Releasing an occupant leaves the seat's other devices exactly where they are (INV-07, INV-04)**
- Given a seat that has an occupant, a device assigned to it and designated primary, and a second
  device assigned to the same seat as a secondary device
- When I release that seat
- Then both devices are still assigned to that same seat
- And neither device is that seat's primary device
- And neither device has been deleted
- And neither device's owner has changed

This is AC-6's control. Without it, the criterion set cannot distinguish a release that downgrades
the primary from one that clears the seat's device associations wholesale, and the second is the more
damaging failure because it silently moves owned equipment into inventory. INV-07 permits a device to
sit unassigned; it does not require a release to put one there.

**AC-8 — Release is refused for a seat that has no occupant**
- Given a seat with no occupant
- When the release operation is invoked for that seat
- Then no seat changes
- And no device changes
- And a message states that the seat has no occupant to release

Same shape as AC-3, and the same reason: AC-1 puts the release control only on occupied seats, so
this path is reached by a stale view or a concurrent release, not by a visible button. A release that
silently succeeds against an empty seat is a write path with nothing to write, and if it also runs
the INV-06 downgrade it is a write path that can demote a device on a seat that never had an
occupant to lose.

**AC-9 — Assignment is refused when no member is chosen**
- Given the assign control for a seat that has no occupant
- When I submit without choosing a member
- Then no assignment is made
- And a validation message is shown against the member field
- And that seat still has no occupant

**AC-10 — A seat's status is derived from its occupancy and is never set directly (INV-03)**
- Given the seat occupancy screen
- Then no control anywhere on this surface sets, confirms, or corrects a seat's status
- And when I assign an occupant to a seat that has none, that seat's status shows it occupied
- And when I then release that seat, its status shows it free
- And when I then assign a different member to that same seat, its status shows it occupied again
- And at no point in that sequence am I asked to supply a status

INV-03 is about the absence of a stored column, which is not directly observable from outside the
system. What *is* observable is the whole of the behaviour a stored column would put at risk: status
tracking occupancy through three consecutive writes with no second act, and no affordance anywhere
that could write a status independently of an occupancy change. A surface that offers a status
control has already lost the invariant regardless of what the schema says.

**AC-11 — Assigning a new occupant does not promote the previous occupant's devices (INV-05, INV-04)**
- Given a seat that was released while it held two devices, both now secondary and both owned by the
  previous occupant
- And that seat has no occupant
- When I assign a different member to that seat
- Then that seat's occupant is the member I assigned
- And neither device becomes that seat's primary device
- And that seat still has no primary device
- And neither device's owner has changed
- And neither device's seat has changed

INV-05 says a seat's primary device must be owned by that seat's current occupant. The state this
criterion sets up is the one where an assignment could break it: the seat carries devices belonging
to somebody who no longer sits there. The two ways to break INV-05 from here are to promote one of
those devices on assignment — which gives the seat a primary device owned by a non-occupant — or to
quietly reassign the devices' owner to the incoming member, which rewrites ownership of equipment
nobody asked to transfer. This criterion refuses both. Designating a primary device is `DEV-01`'s
operation and out-of-scope item 6 here; the correct behaviour for this ticket is to change occupancy
and touch nothing else.

AC-3, AC-8, AC-9, and the negative clauses of AC-7, AC-10 and AC-11 are the refusals. They are stated
as criteria rather than left implicit because an AC set that describes only success describes half the
behaviour, and the omitted half is where the invariants live.

## Invariants touched

`[INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07]`.

`ticket.yaml` transcribed four IDs from the registry row and recorded that the BA owes per-ID
reasoning. The list is **extended by three, not narrowed.** All four transcribed IDs survive. The
three added are the device-side consequences of ending occupancy, and they are added on the ledger's
own instruction to follow indirect chains: *an invariant reached through a cascade is still reached*.

**Engaged:**

- **INV-01** (a seat has at most one occupant) — AC-2 and AC-3 are this invariant. This ticket is the
  first write path to the occupancy relation INV-01 constrains, so before it, INV-01 held only because
  nothing could make it false.
- **INV-02** (one person may occupy multiple seats) — AC-4. This one is engaged in the direction that
  is easy to miss: the invariant is the *absence* of a constraint, so it is broken by adding one, and
  the constraint a developer adds by reflex when implementing seat assignment is *one seat per
  person*. There is nothing for a database to enforce here and nothing for a check to refuse; the only
  protection is a criterion that fails if the refusal appears.
- **INV-03** (seat status is derived, never stored as a column) — AC-1 and AC-10. This is the first
  surface that displays a seat's status, and displaying it is where the temptation to cache it starts.
  `data-model.md` states the mechanism as *the absence of a column* and forbids any seed that writes
  one.
- **INV-06** (when an occupant exits, that seat's primary device auto-downgrades to secondary) —
  AC-6. This is the ticket the invariant was waiting for. `DEV-01` recorded that its own obligation to
  INV-06 was *negative* — do not create a state in which the downgrade cannot fire — because it built
  no occupant-exit path. SEA-01 builds it, so the obligation here is positive and is the reason this
  ticket writes device state at all.
- **INV-05** (a seat's primary device must be owned by that seat's current occupant) — AC-6 and
  AC-11. It cannot be omitted while INV-06 is listed: the ledger states plainly that *INV-06 is a
  consequence, not an independent rule — it is what INV-05 forces to happen when occupancy ends.*
  Listing the consequence and not its cause would leave R8 checking the mechanism without checking
  what the mechanism is for. AC-11 is where INV-05 is at genuine risk, because assigning a new
  occupant to a seat still holding the previous occupant's devices is the one state this ticket can
  produce in which a promotion would break it.
- **INV-04** (a seat has at most one primary device) — AC-6, AC-7, AC-11. Engagement is
  one-directional and is stated that way so R8 has a claim it can falsify rather than a gesture: the
  release path writes the very designation INV-04 constrains, and every write it makes *removes* a
  primary designation, so release alone cannot produce a second one. What can is AC-11's assignment
  path if it promotes, which is why the criterion asserts the seat still has no primary device
  afterwards. A reviewer checking R8 should confirm that no code path in this ticket sets a primary
  designation at all.
- **INV-07** (devices may exist unassigned in inventory) — AC-7. The release path has to decide what
  becomes of the seat's device *associations*, and that decision is INV-07's subject. This story
  chooses that they do not move: the devices stay on the seat, downgraded. The alternative — detaching
  them into inventory on release — is legal under INV-07, which is exactly why the choice needs a
  criterion rather than a silence. Concluding INV-07 unengaged *because* this story chose not to
  detach would be the circular reasoning the ledger warns about, and it is the error `ROO-01` made
  when it first wrote `[]`.

**Not engaged, having been reasoned through:**

- **INV-08** (no self-signup) — this surface creates no account and no member. An occupant is chosen
  from members the system already holds (AC-2, assumption A-4), and member creation is out-of-scope
  item 7. Unlike `MEM-01`, which had to list INV-08 because its create form sits one decision away
  from becoming an account-creation route, nothing on this surface creates a person.
- **INV-10** (no two seats overlap within a room) — excluded by the scope decision recorded above.
  This ticket writes no `gridX`, `gridY`, `gridW` or `gridH`, places no seat, creates no seat, and
  renders no grid. Assignment and release do not read placement and cannot alter it. Were placement
  pulled in, INV-10 would join this list and the ticket would move to `LAY`.
- **INV-11** (deleting a room deletes its seats) — no room is created, edited, or deleted here. The
  chain the ledger documents from INV-11 through INV-06 runs the other way: a room delete reaches
  occupancy, and `ROO-01` listed these IDs for that reason. Nothing on this surface reaches a room.
- **INV-12** (a Member may not be deleted while they occupy a seat or own a device) — no member is
  deleted here, and this ticket builds no deletion path of any kind. INV-12 is `MEM-01`'s to
  implement, and `ticket.yaml` records that the two tickets are disjoint because `MEM-01` enforces it
  by *reading* occupancy while this ticket writes it. The relationship is worth stating rather than
  omitting: **this ticket's release path is the mechanism INV-12's "the references are removed first"
  refers to.** SEA-01's obligation is therefore negative and is discharged by AC-5 — occupancy must be
  removable — and AC-5 is the ticket's headline behaviour, so there is no state SEA-01 can produce
  from which INV-12's refusal becomes permanent. That is a real check but it is a check on the absence
  of an obstruction, not on a write this ticket makes, and putting INV-12 on the list would tell R8 to
  find a mechanism holding it in code that contains no member deletion.

`INV-09` is unissued and cannot be touched by anything.

## Permissions

**This ticket enforces no permission gate, and that is a known gap rather than an omission.** The
`AUT — Authentication & Accounts` table in `.ai/registry/features.md` is empty: no authentication
feature has been specified, so there is no session, no role to read, and no rank to compare. `ROO-01`
and `DEV-01` both shipped under the same condition and recorded it the same way.

Consequently, while this ticket is the current state of the code, **every seat assignment and every
release is reachable by anyone who can reach the application.** That is the operator's accepted trade
for validating the loop against `DATA_SOURCE=mock`, and it is written here rather than left as a
silence, because a surface that looks guarded and is not is worse than one that is plainly ungated.

The permission model this surface is *intended* to have is recorded below for the `AUT` ticket that
will implement it. It is not implemented by SEA-01 and no criterion here asserts it. It is transcribed
from the role scopes in `.ai/standards/rbac-and-security.md` — *Admin: everything, including room,
seat, and layout CRUD*; *Manager: approve requests, assign seats, manage accounts, members, and
devices*; *User: view, request seats, manage their own devices* — and from the glossary's definition
of **Self-release**.

| Actor | See the surface | See every seat's occupant | Assign any member | Release any seat | Release a seat they occupy themselves | Request a seat |
|---|---|---|---|---|---|---|
| `ADMIN` | yes | yes | yes | yes | yes | n/a |
| `MANAGER` | yes | yes | yes | yes | yes | n/a |
| `USER` | yes | yes | **no** | **no** | **yes** | yes, via `REG` |
| Unauthenticated | no | no | no | no | no | no |

`USER` is the row that is not a rank comparison alone, and it is the row this ticket cannot build.
The glossary defines **Self-release** as *an occupant vacating a seat they currently occupy, without
approval*, taking effect immediately — which is a rank check plus an ownership check, in the shape
`rbac-and-security.md` describes for *manage their own devices*: rank permits a User to reach the
release endpoint at all, and ownership decides which seats. A User acting on a seat they do not occupy
must be refused by the same mechanism that refuses an unauthenticated caller, not by a filtered list,
because the action can be invoked without the list.

The `USER` *assign* cell is `no` deliberately and is not a rank threshold that could be lowered later
by accident: a User obtaining a seat goes through a **seat request** (glossary: targeted or open, both
approved by a Manager or Admin), which is the `REG` group. A User who can assign themselves a seat
directly has routed around the approval the request exists to obtain.

When the guard is built it belongs in the server action on every operation above, not only in the UI.
`PermissionGate` hides a control and does not protect an operation. That requirement travels to the
`AUT` group with out-of-scope item 5; it is stated here so it is not lost in the move.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Seat placement and everything spatial — INV-10.** Grid coordinates, footprints, `gridX`,
   `gridY`, `gridW`, `gridH`, drag and drop, the room grid, and any view that shows where a seat
   physically is. Goes to the **`LAY` group**, which has no feature row and no ticket. This is the
   scope decision recorded in full at the top of this story; it is repeated here because this is the
   section DESIGN reads to know where the boundary is. A seat occupancy surface that grows a *move
   this seat* control has left this ticket.
2. **Seat CRUD.** Creating, editing, renaming, or deleting a seat, and network ports. A port belongs
   to a seat and is part of that seat's fixed physical description (glossary); it does not move when
   an occupant changes, and nothing on this surface shows or edits one. This ticket assigns and
   releases occupants of seats that already exist; it creates none and destroys none. Goes to the
   `SEA` group and needs its own feature row, which does not exist.
3. **Seat requests and approval.** Targeted requests, open requests, an approval queue, and any
   workflow in which an assignment is proposed before it is made. Goes to the **`REG` group**.
   Assignment in this ticket is direct and immediate (assumption A-6): whoever reaches the surface
   assigns, and nothing is queued for approval.
4. **Self-release as a role-scoped capability.** The glossary's *Self-release* is an occupant
   vacating **a seat they currently occupy**, and *they* requires a session to identify. The
   occupant-exit *mechanics* — including the INV-06 downgrade — are fully in scope and are AC-5, AC-6
   and AC-7. What is out of scope is the ownership check that makes a release a *self*-release, which
   goes to `AUT` with item 5. This distinction is stated rather than left implicit because the release
   this ticket builds and the self-release the glossary defines do the same thing to the data and
   differ only in who is permitted to invoke it.
5. **Sessions, roles, and any guard on this surface.** Sign-in, account creation, role assignment,
   the rank check, and the ownership check the `USER` row of the Permissions table needs: all go to
   the **`AUT` group**, which has no feature row and no ticket. They cannot be specified against this
   ticket because the thing they check does not exist, and they must not be specified against a
   stubbed session — a criterion that passes against a role read from a cookie reports that
   authorization was verified when nothing was. **No `AUT` ticket is created by this story;** adding
   the feature row is the human BACKLOG step (RULE-01).
6. **Devices as a surface.** Creating, editing, deleting, assigning, unassigning, or designating a
   primary device. All of that is `DEV-01`, which is DONE. **The only device write this ticket makes
   is the INV-06 downgrade on release** (AC-6), and the only device state it asserts otherwise is that
   nothing else moved (AC-7, AC-11). No device is shown, chosen, or edited by hand here. A seat
   occupancy surface that grows a *make this the primary device* control has left this ticket and is
   duplicating `DEV-01`.
7. **Members as a surface.** Creating, editing, deleting, or listing members. An occupant is chosen
   from the members the system already holds (AC-2, assumption A-4); no member is created and none is
   deleted. Goes to the `MEM` group — **`MEM-01`, which is running in parallel with this ticket.**
   `ticket.yaml` records the two as disjoint and states the one decision that would break the
   disjointness; that is noted again as `Q-3` below because it is a decision `MEM-01`'s DESIGN makes,
   not this one.
8. **Any schema change.** This ticket writes no migration and changes no model. `schema_delta` is
   `none` and `requires_adr` is `false`, and both stay that way. If seat occupancy turns out to be
   undeliverable without a migration, the ticket stops rather than acquiring one at DESIGN or
   IN_PROGRESS.
9. **The database-level mechanism for INV-01.** `data-model.md` records that INV-01 needs *a
   uniqueness constraint on the current-occupancy relation — not application logic.* Under
   `DATA_SOURCE=mock` there is no database to hold it, so in this ticket INV-01 is held in
   `src/lib/data/` and nowhere else, which is weaker than a constraint. The weakness is stated here
   rather than hidden; it is the same trade `DEV-01` recorded for INV-04 and INV-05 as its item 6.
   Applying the constraint belongs to the ticket that applies the schema.
10. **Occupancy history.** Who sat in a seat before, when they arrived, when they left, and how long
    a seat has been free. No invariant in the ledger has occupancy history as its subject and no
    registry statement requires it. It is named here because *who used to sit here* is the second
    question anyone asks of a seat register, and the answer for SEA-01 is that the system does not
    record it. A release destroys the fact that the occupancy existed.
11. **Seat list ergonomics.** Search, filtering, sorting, pagination, bulk assign, bulk release,
    import and export, and any *free seats only* view. Each needs its own feature row.
12. **Seats and occupancy on any other surface.** An occupancy count on the dashboard, a seat panel
    on a device, a seat picker inside a request, an occupancy layer in the Layout Designer, a *my
    seats* view for a signed-in user. Go to `DSH`, `DEV`, `REG`, `LAY`, and `AUT` respectively. Each
    needs its own feature row.
13. **Tracker synchronization.** `sync_enabled` is false and the tracker is never on the critical
    path (RULE-10). `/sync-tracker` owns it.

## Open questions

Assumptions ship as written; each is falsifiable, and reversing one is an amendment to this story
(RULE-14). Nothing in this section blocks SPEC. Items prefixed `Q-` are questions this story cannot
answer from the registry and expects a downstream stage to answer through the clarification channel.
Items prefixed `H-` are for a human: they are registry edits, and RULE-01 requires an ADR and human
approval regardless of what a hook does or does not refuse.

- **A-1 — Placement is out of scope and INV-10 is not engaged.** This is the ticket's structural
  assumption and it is the one whose reversal is most expensive, because it moves the row to `LAY`.
  It is grounded in the registry row rather than assumed, and the full reasoning is at the top of this
  story. Recorded here as well so that a reader scanning only this section does not miss that the
  question was asked and answered.
- **A-2 — Releasing an occupant downgrades the seat's primary device and does not detach it
  (AC-6, AC-7).** INV-06 says the primary device becomes secondary and is silent on the device's seat
  association. Downgrading without detaching is the reading that changes exactly what the invariant
  names and nothing else. Detaching into inventory is legal under INV-07 and would also satisfy
  INV-06's letter, so this is a genuine choice: if the operator wants a release to clear a seat's
  devices, that is an amendment here, not a decision at DESIGN.
- **A-3 — Assignment and release are single acts on an existing seat.** Assigning does not create a
  seat; releasing does not delete one. The seat is unchanged in every respect except who occupies it.
  The alternative — a *reassign* operation that moves an occupant from one seat to another in one
  write — is not specified here: it is expressible as a release followed by an assignment, and
  collapsing them would put the INV-01 check and the INV-06 downgrade on a single path where the
  ordering between them decides the outcome. If DESIGN finds the split produces a workflow nobody
  would use, that is an amendment here.
- **A-4 — An occupant is a member the system already holds, chosen rather than typed (AC-2).** The
  glossary defines an Occupant as *the person currently assigned to a seat* and a Member as *a person
  recorded in the system*, and INV-08 forbids any path that creates an account outside Manager or
  Admin action. Typing a free-text occupant would either invent a member or record a person the system
  does not hold; neither is acceptable, and out-of-scope item 7 forbids creating one here. This is
  `DEV-01`'s assumption A-4 in the occupancy direction.
- **A-5 — The seeded data contains at least one seat that has an occupant and a primary device
  assigned to it, and at least one seat with no occupant.** AC-6 and AC-7 need the first; AC-2, AC-4,
  AC-9 and AC-11 need the second. `.ai/standards/data-model.md` records the seed as 2 rooms, about 12
  seats, 3 members, and 5 devices — 2 primary, 2 secondary, 1 unassigned — and INV-05 makes each
  primary device owned by its seat's occupant, so a seat with both exists. `ROO-01`'s AC-14 names
  `dev-01` as assigned and primary within `ROOM-A`, and the Q12 amendment in that story's changelog
  records that `dev-01` and `dev-03` are the only two devices that are both assigned and primary. The
  unoccupied seat follows from three members across about twelve seats, but that is an inference from
  counts. **`DEV-01` has shipped since those facts were written and its surface can move a device's
  seat and its designation.** If the seed no longer holds a seat with an occupant and a primary
  device, AC-6 and AC-7 have no Given and this story must be amended, not worked around. AC-7
  additionally needs a seat holding *two* devices, one primary and one secondary; the seed's 2 primary
  and 2 secondary devices make that possible but do not guarantee they share a seat, which is `Q-4`.
- **A-6 — Assignment is direct and requires no approval (out-of-scope item 3).** Whoever reaches the
  surface assigns, and the assignment takes effect immediately. The approval path the glossary
  describes belongs to a seat *request*, which is the `REG` group and is a different act: a request is
  a Member asking, an assignment is a Manager doing. Nothing in this ticket queues, proposes, or
  awaits.
- **A-7 — Group membership does not constrain who may occupy which seat.** The glossary is explicit
  that a Group is a grouping of people, not of seats, and that *group membership is independent of
  seat occupancy — two members of the same group need not sit near each other.* No criterion here
  filters the choice of occupant by group, and no seat is reserved for one. If seats are ever scoped
  to groups, that is a new invariant or a `GRP` feature, not a refinement of AC-2.
- **Q-1 — What identifies a seat on this surface, and what are the occupancy field names?** This
  story did not read `src/**` (RULE-05), and no document in the registry or the standards names a
  field of a seat. `.ai/standards/data-model.md` states plainly that it *contains no field names* and
  that inventing them is prohibited. AC-1 is therefore written against *the seat identifier the
  surface displays* rather than a field, and every other criterion refers to a seat by role in the
  scenario. `ticket.yaml` mentions `occupantId` in a comment about `MEM-01`'s read path, which is a
  board-plane note about another ticket and not a contract this story is entitled to assert.
  **DESIGN is expected to transcribe the seat's field set as a finding and raise it with `ba`**, which
  amends AC-1 under RULE-14. This is the `ROO-01` finding-B2 channel and it does not block this stage:
  the criteria are correct as written and become more specific, not different, when the answer
  arrives.
- **Q-2 — Is the seat occupancy surface scoped to one room, or is it a flat list of every seat?**
  AC-1 is written as *every seat the system holds within the scope of that screen*, which is true
  under either answer and is deliberately so. With about twelve seats across two rooms a flat list is
  adequate; a room-scoped surface needs a room chooser and makes every criterion room-aware, which is
  a materially larger surface and moves `size`. This story's position is that room scoping is list
  ergonomics — out-of-scope item 11 — and that a flat list is sufficient for SEA-01, but the choice is
  DESIGN's to confirm and it is the same question `DEV-01` raised as its `Q-2` about the seat picker.
- **Q-3 — For `MEM-01`'s DESIGN, not this one: where does a member-centric occupancy query live?**
  `ticket.yaml` records that SEA-01 and `MEM-01` are dispatched in parallel on the strength of their
  `allowed_paths` being disjoint, and names the single decision that would break it — `MEM-01`
  putting a helper such as `seatsOccupiedBy(memberId)` into `mock/seats.ts`, which this ticket writes.
  It is restated here because it is invisible from `MEM-01`'s own artifacts, and because SEA-01 has no
  way to detect the collision itself: it would surface as a merge conflict or as one ticket silently
  overwriting the other. This story asks nothing of `MEM-01` and expresses no preference between
  cohesion and parallelism; it records that the decision is real and is `MEM-01`'s to make
  deliberately.
- **Q-4 — Does any seeded seat hold two devices, one primary and one secondary?** AC-7 needs one.
  The seed's composition permits it and does not require it, and this story cannot check (RULE-05).
  If no such seat exists, AC-7's Given must be reduced to a single primary device, which weakens the
  criterion to the point where it can no longer distinguish a downgrade from a wholesale detachment —
  in which case the right answer is a fixture change rather than a weakened criterion, and that is a
  decision, not a workaround. **DESIGN or QA is expected to check this and raise it.**
- **H-1 — The `features.md` row for SEA-01 records `INV-01, INV-02, INV-03, INV-06`.** This story
  records seven IDs; INV-04, INV-05 and INV-07 are missing from the row. The reasoning for each is in
  the *Invariants touched* section above. Registry, human-only under RULE-01. This is `ROO-01`'s `H-1`
  and `MEM-01`'s equivalent a third time, which is itself worth a human's attention: three
  consecutive tickets have found their registry row's invariant list narrower than the story's, which
  suggests the row is being written from the feature's title rather than from its consequences.

## Changelog

- `2026-08-24T01:47:19Z` — initial version, all sections. Raised by `ba`. Amended by `ba`. No
  clarification was requested and `consulted` is empty. The placement scope question posed by
  `ticket.yaml` was settled in this version — assignment and release only, INV-10 excluded, the
  ticket stays in `SEA`. `invariants_touched` extended from the four transcribed IDs to seven;
  `size_estimate` set to `M`.
