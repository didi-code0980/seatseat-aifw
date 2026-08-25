---
ticket: MEM-01
stage: SPEC
agent: ba
produced_at: 2026-08-23T08:56:30Z
inputs_read: [ .ai/board/tickets/MEM-01/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/registry/rules.md, .ai/registry/decisions/ADR-003-member-identity.md, .ai/registry/decisions/ADR-004-file-write-guards-removed.md, .ai/registry/decisions/ADR-005-member-deletion-refused.md, .ai/standards/rbac-and-security.md, .ai/standards/data-model.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: READY
---

# MEM-01 — Member CRUD UI

Every acceptance criterion below derives from `.ai/registry/features.md`,
`.ai/registry/invariants.md`, `.ai/registry/glossary.md`, `ADR-003`, and `ticket.yaml`.
`rbac-and-security.md` supplied the intended permission model and the `ROLE_RANK` ordering;
`data-model.md` supplied the prohibition on inventing field names and the seed composition cited
under Open questions. No acceptance criterion originates in a tracker description (RULE-17) or in
`src/**` (RULE-05, never read).

**This story blocked on one question and no longer does.** `Q-1` — whether deleting a Member who
occupies a seat or owns a device refuses or cascades — was answered `refuse` by the operator on
2026-08-23 and issued as **INV-12** under **ADR-005**. AC-10 and AC-11 were placeholders and are now
criteria; `invariants_touched` narrows accordingly. The resolution is recorded in full under Open
questions, and what changed is itemised in the Changelog.

`next_state` reads `READY` because that is the state this story is written toward. **This story does
not put the ticket there.** DoR is the orchestrator's evaluation and the ticket is left at `SPEC`.

## Feature

Transcribed from the `MEM — Members` table of `.ai/registry/features.md` without paraphrase:

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| MEM-01 | Member CRUD UI | MEM | PLANNED | INV-08, INV-12 | Third CRUD slice, first row written by an agent (ADR-004). Member deletion resolved to a **refusal** at SPEC — ADR-005, which issues INV-12. INV-01, INV-05 and INV-06 were on this row conditionally and fall away with that answer; INV-12 is on it because MEM-01 is the ticket that implements the deletion INV-12 governs. |

The row is transcribed as it stands, and it now agrees with this story. **It did not when this story
was first written.** The row then read `INV-01, INV-05, INV-06`; this story argued that it omitted
INV-08, which this surface engages directly and unconditionally, and that the three listed IDs were
conditional on an unanswered question. Both points were carried by a human under RULE-01 when `Q-1`
was answered: the row is now `INV-08, INV-12`. The divergence is recorded rather than erased, because
a story whose only evidence of having been right is that the file it disagreed with later changed is
a story nobody can audit.

## User value

The system records people. A **Member** is *a person recorded in the system* (glossary), and every
other domain object leans on that record: a **Seat** has an **Occupant** who is a person, a **Device**
is *a piece of equipment with an owner*, and INV-05 makes a seat's primary device legal only when the
owner and the occupant are the same person. Nothing in the system can currently create that record,
correct it, or remove it — the three members that exist do so because `fixtures.ts` and `prisma/seed.ts`
were seeded with them (`.ai/standards/data-model.md`, *Seeding*).

The person who gains the capability is a Manager or an Admin, whose scope in
`.ai/standards/rbac-and-security.md` is *manage accounts, members, and devices* and *everything*
respectively. What they gain is the ability to answer *who does this organization track, and what may
they do here* — the second half being the role recorded against the member, which is what every rank
comparison in the system is ultimately a comparison of.

`ROO-01` and `DEV-01` both build surfaces that **read** people and cannot produce one. `DEV-01`'s
AC-2 requires an owner *chosen from the members the system holds*, and that phrasing is only true
because MEM-01 is what holds them. This ticket is the one that makes the member set something other
than a fixture.

## Acceptance criteria

**This ticket runs against `DATA_SOURCE=mock` and enforces no role guard.** The `AUT — Authentication
& Accounts` table in `.ai/registry/features.md` is empty, so no authentication feature has been
specified, no session exists to read a role from, and a rank comparison cannot be made. No criterion
below has a role in its Given. `ROO-01` and `DEV-01` shipped under the same condition. See the
Permissions section, which states plainly what this means for a surface that assigns roles, and
out-of-scope items 1 and 2.

"Member management screen" means the surface this ticket delivers; DESIGN names its route. Every
criterion below is observable from outside the system.

**A note on AC-10 and AC-11.** Both were written as placeholders while `Q-1` was open, because the
behaviour they describe was unspecified and this story is forbidden to invent it (CLAUDE.md, *No
invention*: missing information becomes a placeholder plus an entry under Open questions). `Q-1` is
answered and both are now criteria, stated against **INV-12** and **ADR-005**. They kept their
numbers through the change, which is why they were reserved rather than left to be appended.

**A note on field names, now answered.** This story was first written against *every required field*
rather than a list, because no document in the registry or the standards names a field of a Member and
`.ai/standards/data-model.md` states that it *contains no field names* and that inventing them is
prohibited. `Q-2` recorded the gap and asked DESIGN to close it. **F-2 closed it**, transcribing the
field set from `src/lib/data/types.ts` and `prisma/schema.prisma` — files this story may not read
(RULE-05) and did not.

The form collects three fields, all required: **full name**, **email**, and **role**. `id` is minted
by the seam and `groupId` is always null, because group membership is out-of-scope item 5. The
criteria below now name the three instead of gesturing at a set, which is what the story predicted
would happen: *more specific, not different*.

**`role` is required and is not defaulted.** The model carries a `USER` default and the design
deliberately does not use it, because AC-3 refuses a creation with no role chosen and a default would
silently satisfy the thing that criterion refuses. The attribute was the one this story could name
from the start — `rbac-and-security.md` fixes `ROLE_RANK` as `USER < MANAGER < ADMIN` and
`data-model.md` records the seed as *3 members across the three roles*.

**A note on the lettered criteria.** AC-3a, AC-3b, AC-3c, AC-7a and AC-7b were added by this
amendment. They are lettered rather than numbered `AC-12` onward so that the eleven existing IDs keep
their meaning and the twenty-one tests already mapped against them keep pointing at what they were
written for. They are separate criteria rather than clauses inside AC-3 and AC-7 because each has its
own Given and its own When — *the field is blank*, *the email is taken*, *the email is taken in a
different case*, and *the email is malformed* are four different scenarios, and folding them into one
criterion produces exactly the untestable AC that routed this ticket back here.

### Read

**AC-1 — Members are listed with the facts the later criteria turn on**
- Given the system holds at least one member who occupies at least one seat, and at least one member
  who occupies no seat
- When I open the member management screen
- Then every member held by the system is listed
- And each listed member shows the role recorded for them
- And each listed member shows either the seats they currently occupy, or that they occupy none
- And a control to create a member is present

The occupancy clause is not display polish. Under either answer to `Q-1`, deleting a member is an act
whose consequences depend on whether that member occupies anything, and a person cannot take that act
correctly against a screen that hides the fact. It is also what lets AC-8 and AC-9 state their Givens
without asserting a fixture fact that QA can neither observe (RULE-05) nor construct — this ticket
builds no way to assign an occupant, which is out-of-scope item 3.

Whether this list must **also** show the devices a member owns was part of `Q-1`, and the answer
makes it unnecessary. ADR-005 requires the *refusal message* to name what is blocking the delete, so
the device count reaches the person at the moment it is relevant rather than sitting in a column on
every row. AC-11 asserts it there. This keeps the member list from reading device data on every
render, which is also what keeps MEM-01's `allowed_paths` clear of the device surface.

### Create

**AC-2 — A member is created, and is created with a role**
- Given I am on the member management screen
- When I submit the create form with a full name, an email address that no existing member holds, and
  a role chosen from `USER`, `MANAGER`, and `ADMIN`
- Then the new member appears in the member list with the role I chose
- And they are shown as occupying no seat
- And the outcome is confirmed to me without my having to reload the page

**AC-3 — Creation is refused when a required field is missing, blank, or no role is chosen**
- Given I am on the create form
- When I submit with the full name or the email empty or consisting only of whitespace, or with no
  role chosen
- Then no member is created
- And a validation message is shown against each offending field
- And the member list is unchanged

**AC-3a — Creation is refused when the email is already held by another member**
- Given a member exists whose email is a known value
- When I submit the create form with that same email, character for character, and every other field
  valid
- Then no member is created
- And a validation message is shown against the email stating that it is already in use
- And the member list is unchanged
- And the existing member who holds that email is unchanged

**AC-3b — The email refusal is exact, not case-folded**
- Given a member exists whose email is a known value
- When I submit the create form with that email differing only in the case of one or more letters,
  and every other field valid
- Then the member **is** created
- And both members appear in the member list, each with their own email

This is the one criterion in this story that asserts a *permitted* duplicate, and it is here because
the alternative is a rule nobody decided. `Member.email` is `@unique` and Postgres compares it case
sensitively, so `Ada@x.internal` and `ada@x.internal` are two rows the model accepts. Refusing the
second would be stricter than the model and would be invented — and it would be invented in the
direction that is invisible, because a stricter refusal never produces a wrong row, only a rejected
one. If case-folded identity is wanted it is a schema decision, a `citext` column or a normalising
write, and it is not a line in a validation schema. Raised as F-1 at DESIGN and answered here.

**AC-3c — Creation is refused when the email is not a well-formed address**
- Given I am on the create form
- When I submit with an email that is not a well-formed address, and every other field valid
- Then no member is created
- And a validation message is shown against the email
- And the member list is unchanged

**AC-4 — Creating a member does not create a sign-in account (INV-08)**
- Given I am on the create form
- When I inspect every field and control the form offers
- Then no field asks for a password, a credential, or any other means of signing in
- And no control offers to grant the new member the ability to sign in
- And when I submit the form with valid values, the member is created and the surface reports no
  account as having been created

`ADR-003` makes this a real state rather than a technicality: `Member` is its own table carrying a
**nullable** `authUserId`, and *a Member without an `authUserId` is a person the organization tracks
but who cannot sign in*. MEM-01 creates exactly that. INV-08 says accounts are created by Manager or
Admin only, and the ADR is explicit that account-creation flows *create both rows, in that order, or
neither* — that flow belongs to the `AUT` group (out-of-scope item 2). A member-creation form that
quietly grew a password field would be the self-signup route INV-08 removes, reached from an
unauthenticated surface, which is why this is a criterion and not a note.

### Update

**AC-5 — An existing member's attributes are changed**
- Given a member exists
- When I edit that member and submit a different, valid value for their full name or their email,
  leaving the other of the two as it stands
- Then the list shows that member with the new value
- And submitting a member's own existing email unchanged is not refused as a duplicate
- And their role is unchanged
- And the seats they occupy are unchanged
- And no other member is changed in any respect

**AC-6 — A member's role is changed**
- Given a member exists whose recorded role is `USER`
- When I edit that member and change their role to `MANAGER`
- Then the list shows that member with the role `MANAGER`
- And nothing else about that member changes — the seats they occupy and every other field are as
  they were
- And no other member's role changes

**AC-7 — Editing is refused when a required field is cleared**
- Given a member exists
- When I edit that member and submit with their full name or their email emptied or reduced to
  whitespace, or with no role selected
- Then the member is not changed
- And a validation message is shown against each offending field
- And the list still shows that member's previous values

**AC-7a — Editing is refused when the email is already held by a different member**
- Given two members exist with different emails
- When I edit one of them and submit the other's email, character for character
- Then neither member is changed
- And a validation message is shown against the email stating that it is already in use
- And the list still shows both members with the emails they had

**AC-7b — Editing is refused when the email is not a well-formed address**
- Given a member exists
- When I edit that member and submit an email that is not a well-formed address
- Then the member is not changed
- And a validation message is shown against the email
- And the list still shows that member's previous values

### Delete

**AC-8 — Deletion is not performed until it is confirmed**
- Given a member exists who occupies no seat
- When I request their deletion and then dismiss or cancel the confirmation
- Then that member still appears in the member list
- And their role and the seats they occupy are unchanged

**AC-9 — A member who is referenced by nothing is deleted**
- Given a member exists who occupies no seat and owns no device
- When I request their deletion and confirm
- Then that member no longer appears in the member list
- And no other member is affected
- And no seat changes its occupant
- And no device changes its owner, its seat, or its primary or secondary designation

This criterion is **not** blocked by `Q-1`, and that is worth stating rather than leaving to be
noticed. Deleting a member nothing refers to produces the same observable result under a refusal
policy and under a cascade policy, because there is nothing to refuse and nothing to cascade to. It
is the one delete this ticket can specify today, and the control clauses about seats and devices are
what make it evidence that the delete is narrow rather than merely that a row vanished.

**AC-10 — Deleting a member who occupies a seat is refused, and the message names the seat (INV-12)**
- Given a member exists who currently occupies at least one seat
- When I request their deletion
- Then the deletion is refused
- And the refusal names each seat that member occupies
- And that member still appears in the member list, with their role and their occupied seats unchanged
- And no seat changes its occupant
- And no device changes its owner, its seat, or its primary or secondary designation

INV-12 states the refusal; ADR-005 states that the message must name what is blocking it, on the
grounds that *a bare "cannot delete" sends the operator hunting*. The naming clause is therefore a
criterion and not presentation polish — a refusal that does not say which seat is a refusal the
person cannot act on, and the action they must take next is to release that seat, which lives in
`SEA` and `REG` (out-of-scope item 3).

The refusal is raised at the point of request. AC-8's confirmation step is for deletions that can
proceed; a member who cannot be deleted is not asked to confirm something that will not happen.

**AC-11 — Deleting a member who owns a device is refused, and the message names how many (INV-12)**
- Given a member exists who occupies no seat and owns at least one device
- When I request their deletion
- Then the deletion is refused
- And the refusal states how many devices that member owns
- And that member still appears in the member list, unchanged in every respect
- And every device that member owns is unchanged — same owner, same seat, same primary or secondary
  designation

The Given deliberately holds occupancy at zero so that this criterion tests the device half of INV-12
on its own. With both conditions true, AC-10 and AC-11 would be indistinguishable, and a system that
refused on occupancy alone would pass a combined test while permitting a member who owns devices and
sits nowhere to be deleted — which is the half of INV-12 that strands equipment.

**Device ownership is observable without this surface displaying it.** `DEV-01` is `DONE`, and its
AC-1 requires the device list to show each device's owner, so the Given is constructible and checkable
from the device management screen. The count reaches this surface through the refusal message, which
ADR-005 requires and which AC-11 asserts.

### The refusals

AC-3, AC-3a, AC-3c, AC-4, AC-7, AC-7a, AC-7b, AC-8, AC-10 and AC-11 are the refusals — ten of
sixteen criteria. That proportion is right for a surface whose two invariants are both stated as
things that must not happen: INV-08 removes a route, and INV-12 removes a deletion. An AC set that
describes only success describes half the behaviour, and the omitted half is where the invariants
live.

**AC-3b is the one criterion here that asserts a refusal must not happen.** It is listed apart from
the others on purpose: an over-strict refusal is invisible in testing, because it never produces a
wrong row, only a rejected one. Without AC-3b nothing in this story would catch a case-folded email
check, and a case-folded check is a rule stricter than the model that no one decided.

AC-10 and AC-11 are the two this story could not write until `Q-1` was answered. That they are
refusals rather than cascades is a decision recorded in ADR-005 and issued as INV-12, not a choice
made here. AC-3a, AC-3b, AC-3c, AC-7a and AC-7b are the five it could not write until F-1, F-2 and
F-3 came back from DESIGN.

AC-1 to AC-11 plus the five lettered criteria are all live. **No AC number is retired on this ticket
and none has ever been renumbered.**

## Invariants touched

`[INV-08, INV-12]`.

**This list narrowed, and it narrowed because a human answered a question rather than because this
story changed its mind.** It was written `[INV-01, INV-05, INV-06, INV-08]` while `Q-1` was open: the
three IDs transcribed from the `features.md` row were kept because narrowing them was precisely what
`Q-1` decided, and INV-08 was added because this surface engages it unconditionally. ADR-005 answered
`Q-1` with `refuse` and issued INV-12. The three conditional IDs fall away and INV-12 takes their
place. ADR-005 records the same narrowing in its Consequences, and `.ai/registry/features.md` now
carries `INV-08, INV-12` on the MEM-01 row.

The list records what this change **could** affect, not what survives the mitigation. AC-4, AC-10 and
AC-11 exist *because* an invariant was in play; concluding from their presence that it no longer is
would be the circular reasoning `.ai/registry/invariants.md` warns against.

**Engaged:**

- **INV-08** (there is no self-signup; accounts are created by Manager or Admin only) — this is the
  surface on which people enter the system, and `ADR-003` is what lets it do that without touching an
  account: `Member.authUserId` is nullable, and a null means *a person the organization tracks but who
  cannot sign in*. AC-2 creates that person and AC-4 is the criterion that keeps the form from
  acquiring the credential field that would turn creation-of-a-record into creation-of-an-account.
  There is no session on this surface at all today, so a self-signup route here would be reachable by
  anyone — which makes AC-4 the strongest criterion in this story and the one whose removal would be
  least visible.
- **INV-12** (a Member may not be deleted while they occupy a seat or own a device; the deletion is
  refused, not cascaded, and the references are removed first) — **MEM-01 is the ticket that
  implements it, and it is held here or nowhere.** AC-10 is the seat half and AC-11 is the device
  half, deliberately separated so that a system enforcing one and not the other fails a test rather
  than passing a combined one. AC-9 is the permitted case and its control clauses are what stop a
  correct refusal from being confused with a delete that quietly did nothing. Under
  `DATA_SOURCE=mock` there is no database and no constraint, so the invariant lives entirely in
  `src/lib/data/` and review check R8 is the only thing that verifies it — the same exposure INV-04
  and INV-05 have on `DEV-01`.

ADR-005 is explicit that INV-12 must appear on this ticket rather than only INV-08, because *a ticket
that introduces an invariant and does not list it is the one place R8 is guaranteed to miss*. That
sentence is the reason this section names it first among what R8 must check.

**Not engaged, having been reasoned through.** Three of these were listed while `Q-1` was open and are
now discharged; the rest were never engaged and the reasoning is unchanged.

- **INV-01** (a seat has at most one occupant) — *discharged by ADR-005.* It was listed against the
  cascade branch, in which a member delete would have become an occupancy write. Under the refusal
  this ticket writes no occupancy at all and reads it only for AC-1 and AC-10's refusal message, and
  a read cannot make a cardinality constraint false.
- **INV-05** (a seat's primary device must be owned by that seat's occupant) — *discharged by
  ADR-005.* It was listed because a cascade would have removed both terms of its comparison at once:
  the occupant of the seat and the owner of that seat's primary device. Under the refusal, INV-12
  forbids reaching the state in which either term goes missing — which is the sense in which INV-12
  protects INV-05 rather than engaging it.
- **INV-06** (when an occupant exits a seat, that seat's primary device auto-downgrades to secondary)
  — *discharged by ADR-005.* It was the expensive half of the cascade branch: a member delete would
  have been an occupant exit on every seat that member occupied, and INV-06 would have fired on each,
  writing the file `DEV-01` holds. Under the refusal no occupant exit is produced here and the write
  path is not invoked. It remains `SEA`'s and `REG`'s to build.
- **INV-02** (one person may occupy multiple seats) — the invariant is the *absence* of a
  person-to-seat cardinality constraint, and nothing here adds one. AC-1 displays *the seats* a member
  occupies, plural, and AC-10's refusal names each of them, which is INV-02 respected in the reading
  direction.
- **INV-03** (seat status is derived, never stored) — AC-1 reads a member's occupancy, which is
  reading a derived relation, and that is what deriving is for. It would become engaged the moment
  this surface stored an occupancy summary on the member row to avoid the query. It does not, and
  out-of-scope item 3 forbids writing anything on a seat. Stated rather than omitted because a cache
  added at IN_PROGRESS to make a member list render faster is exactly how this invariant is broken by
  a ticket that never intended to touch it.
- **INV-04** (a seat has at most one primary device) — no device is created, assigned, or designated
  here, and under the refusal no device is modified at all. AC-10 and AC-11 both assert devices
  unchanged, which is INV-04 left alone rather than upheld.
- **INV-07** (devices may exist unassigned in inventory) — this ticket assigns and unassigns nothing.
  It appears in ADR-005's rationale for a different purpose: INV-07 permits an *unassigned* device,
  which is about seats, and does not permit an *unowned* one — which is one of the three grounds the
  cascade was rejected on. That is an argument about what the answer should be, not a claim that this
  story engages the invariant.
- **INV-10** (no two seats overlap within a room) — this ticket places no seat and reads no grid
  coordinate.
- **INV-11** (deleting a room deletes its seats, behind a confirmation naming the count) — no room is
  reachable from this surface. INV-11 is cited in ADR-005 as the registry's one worked precedent for a
  destructive cascade, and as the pattern whose *absence* for members was evidence. ADR-005 also
  records why the analogy fails where it matters: a seat has no existence apart from its room, and a
  device does have existence apart from its owner.

`INV-09` is unissued and cannot be touched by anything.

## Permissions

**This ticket enforces no permission gate, and on this surface that gap has a sharper edge than it
had on `ROO-01` or `DEV-01`.** The `AUT` table in `.ai/registry/features.md` is empty: there is no
session, no role to read, and no rank to compare. Consequently, while this ticket is the current state
of the code, **anyone who can reach the application can create a member with the `ADMIN` role.**

That is worth stating in exactly those words. `rbac-and-security.md` says *permission questions are
answered by rank comparison*, and this is the surface that writes the value every one of those
comparisons is made against. An ungated room list leaks room names; an ungated member-role editor
hands out the top of `ROLE_RANK`. Both are the same accepted trade — validating the loop against
`DATA_SOURCE=mock` before `AUT` exists — and this one is recorded loudly rather than quietly because
the cost of forgetting it is not the same.

The permission model this surface is *intended* to have is recorded below for the `AUT` ticket that
will implement it. It is not implemented by MEM-01 and no criterion above asserts it. It is
transcribed from the role scopes in `.ai/standards/rbac-and-security.md` — *Admin: everything*;
*Manager: approve requests, assign seats, manage accounts, members, and devices*; *User: view,
request seats, manage their own devices*.

| Actor | See the surface | List members | Create | Edit attributes | Change role | Delete |
|---|---|---|---|---|---|---|
| `ADMIN` | yes | yes | yes | any | any, to any role | any |
| `MANAGER` | yes | yes | yes | any | see below | any |
| `USER` | no | no | no | no | no | no |
| Unauthenticated | no | no | no | no | no | no |

`USER` is `no` on every column because *manage their own devices* is the whole of the User scope that
touches this data, and it is a device capability, not a member one. Whether a User may view or edit
their **own** member record is not answerable from `rbac-and-security.md` and is not assumed here; it
belongs to `AUT` with out-of-scope item 1.

**The `MANAGER` role-change cell is the open one, and it is a rank question rather than a scope
question.** `rbac-and-security.md` grants Manager *manage accounts and members* and simultaneously
states that *a capability that is not expressible as a rank comparison needs an ADR, because ad-hoc
capability lists are where authorization bugs live*. A Manager promoting a member to `ADMIN` is a
Manager granting a rank above their own, which is privilege escalation expressed as ordinary member
management. The natural rank comparison — a caller may assign a role no higher than their own — is not
written anywhere in the registry, and this story does not invent it. It is recorded here as the
question the `AUT` ticket inherits, alongside `Q-3` below. It does not block MEM-01, because MEM-01
enforces no rank at all.

When the guard is built it belongs in the server action on every column above, not only in the UI.
`PermissionGate` hides a control and does not protect an operation, and a hidden role selector over an
unchecked action is an open role selector.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Sessions, roles as a guard, and any rank check on this surface.** Sign-in, the rank comparison,
   and the ownership question for a User's own record: all go to the **`AUT` group**, which has no
   feature row and no ticket. They cannot be specified against this ticket because the session they
   read does not exist, and they must not be specified against a stub — a criterion that passes
   against a role read from a cookie reports that authorization was verified when nothing was. **No
   `AUT` ticket is created by this story;** adding the feature row is the human BACKLOG step
   (RULE-01).
2. **Accounts, credentials, and the `Member`-to-`user` link.** Creating a Better Auth `user`, linking
   an existing member to one, unlinking, password reset, and invitation. `ADR-003` requires
   account-creation flows to create both rows or neither, and that flow is an `AUT` capability. AC-4
   is the criterion that keeps it out of this surface; it is a refusal, not an implementation.
3. **Seats and occupancy.** Creating, editing, deleting, or placing a seat; assigning an occupant;
   releasing one. This ticket **reads** the seats a member occupies, because AC-1 and the `Q-1`
   decision are not evaluable without them, and **writes nothing on a seat**. Seats go to the `SEA`
   group; occupancy and self-release go to `SEA` and `REG`. A member surface that grows an *assign a
   seat* control has left this ticket.
4. **Devices.** Creating, editing, assigning, unassigning, designating primary, or deleting a device.
   `DEV-01` owns all of it, and it is `DONE`. This ticket **reads** how many devices a member owns,
   because AC-11's refusal message must state the count and ADR-005 requires it to; it **writes
   nothing on a device**. In particular MEM-01 does not release, reassign, or downgrade a device in
   order to make a deletion possible — INV-12 puts that work before the deletion and outside this
   ticket. A member surface that grows a *reassign this device* control has left this ticket.
5. **Groups.** Assigning a member to a group, group nesting, and any group-scoped view of members.
   `groupId` is always null on a member this ticket creates, and no control sets it. The existing
   scaffold rendered a Group column showing the raw `groupId`; the design drops it, and this story
   endorses that — a group id is not a group name, no seam function resolves one, and a column
   showing it makes the surface look like it manages groups. Recorded from F-2. The
   glossary defines a Group as *a grouping of people* and says *a Member belongs to a Group*, so the
   relation is real and is deliberately not built here. Goes to the `GRP` group, which has no feature
   row.
6. **Seat requests.** Targeted and open requests, and their approval. Goes to `REG`.
7. **Any schema change.** This ticket writes no migration and changes no model. `schema_delta` is
   `none` and `requires_adr` is `false`, and both stay that way. `ADR-003` is already accepted and
   MEM-01 does not re-open it. If member CRUD turns out to be undeliverable without a migration, the
   ticket stops rather than acquiring one at DESIGN or IN_PROGRESS.
8. **Member list ergonomics.** Search, filtering, sorting by role, pagination, bulk create, bulk
   delete, import and export, archiving, and soft delete or restore. AC-9 specifies a real delete.
   Each of these needs its own feature row.
9. **Member history.** Which seats a person has occupied, which devices they have held, when their
   role last changed, and who changed it. No invariant in the ledger has member history as its
   subject and no registry statement requires it. It is named here because *who made this person an
   Admin* is the first question anyone asks after an incident, and the answer for MEM-01 is that the
   system does not record it.
10. **Deactivation as an alternative to deletion.** A disabled or archived member who keeps their
    history is a plausible third answer to `Q-1` and is **not** offered as one, because it is a new
    domain state and inventing domain states is what RULE-01 reserves to a human. If the operator
    wants it, it is a feature row and an invariant, not a scope decision taken here.
11. **Tracker synchronization.** `sync_enabled` is false and the tracker is never on the critical
    path (RULE-10). `/sync-tracker` owns it.

## Open questions

**Nothing here blocks.** `Q-1` blocked this stage and is now resolved; it is kept in full below
rather than deleted, because the reasoning that produced the answer is what a later reader needs and
the ADR indexes it rather than repeating it. Each remaining assumption is falsifiable, and reversing
one is an amendment to this story under RULE-14. Items prefixed `Q-` are questions this story cannot
answer from the registry; items prefixed `A-` are assumptions that ship as written.

### Q-1 — RESOLVED — Deleting a Member who occupies a seat or owns a device: refuse, or cascade?

**Answered `refuse` by the operator on 2026-08-23. Issued as INV-12; recorded in
`.ai/registry/decisions/ADR-005-member-deletion-refused.md`.**

| | |
|---|---|
| Asked by | `ba` at SPEC, as the blocking question of this story |
| Answered by | the operator — RULE-01 makes the registry human-only, RULE-09 makes ADRs human |
| Instrument | INV-12 in `.ai/registry/invariants.md`; ADR-005; the MEM-01 row in `features.md` |
| Effect here | AC-10 and AC-11 stop being placeholders; `invariants_touched` narrows to `[INV-08, INV-12]` |

**Why it had to be asked rather than assumed.** Nothing in `.ai/registry/**` answered it, and the two
nearest precedents pointed opposite ways. INV-11 makes a room delete cascade to its seats,
destructively, behind a confirmation that must name what will be lost. `ADR-003` makes deleting a
Better Auth `user` **not** cascade to the Member it points at — `onDelete: SetNull` — because *a
person who has left the organization whose occupancy history must survive their account*. Neither
governs `Member -> occupancy` or `Member -> device`. INV-11 was issued by a human to answer the
equivalent question for rooms, and no equivalent had been issued for members; inventing one is what
RULE-01 reserves.

**The three grounds the answer rests on**, as ADR-005 records them:

1. **Cascade contradicts the definition of a Device.** The glossary makes a Device *a piece of
   equipment with an owner* — ownership is definitional. A cascade must either strand devices with no
   owner or destroy the equipment record because a personnel record changed. INV-07 permits an
   *unassigned* device, which is about seats; it does not permit an *unowned* one.
2. **The registry says so out loud when it wants a destructive cascade.** INV-11 mandates the
   cascade, states it cannot be undone, and requires the interface to name what is lost. That is what
   the ledger looks like when it means cascade, and it says nothing of the kind about Members.
3. **`ADR-003` built the Member table so departed people keep their history.** The normal
   representation of someone who has left is a surviving Member row, which makes cascade-on-delete a
   solution to a problem the model does not have.

**One ground this story offered was withdrawn before the answer, and a second is corrected by it.**
The withdrawn one was disjointness from `DEV-01`'s `allowed_paths` — it expired when `DEV-01` merged,
and it was listed last and labelled the weakest on the stated reasoning that process convenience must
not decide a domain question. The correction is that ADR-005 requires something this story did not
ask for: **the refusal must name what is blocking it**, because *a bare "cannot delete" sends the
operator hunting*. That obligation is now AC-10's seat-naming clause and AC-11's device count, and it
is the one part of the answer that came from the decision rather than from the question.

**What the refusal costs, unchanged from when it was proposed.** A member who occupies a seat can only
be deleted after something releases the seat, and a member who owns a device only after something
reassigns it — and those are `SEA`, `REG` and the device surface. Until `SEA` and `REG` exist, a
seeded member who occupies a seat cannot be deleted through any path this system offers. That is the
price of not inventing a destructive semantics, it was stated before the decision rather than after,
and out-of-scope item 10 names deactivation as the thing a human may want instead and this story may
not invent.

### The rest — non-blocking

- **A-1 — A member's delete is confirmed before it is performed (AC-8, AC-9).** No invariant requires
  it. INV-11 requires a confirmation for a *room* delete and says nothing about members. The
  confirmation is asserted on the ordinary grounds that a destructive action reached by one click is
  a mis-click away from data loss, and it is recorded as an assumption rather than an invariant so
  that a decision to drop it is visible as a decision.
- **A-2 — FALSIFIED, and it predicted its own falsification.** It read: *member names are not
  required to be unique; no registry statement requires it, so nothing in AC-3 or AC-7 refuses a
  duplicate*, and it asked DESIGN to check. DESIGN checked and found `Member.email @unique` — F-1.
  The assumption was right about the *name* and wrong about the entity: a member does carry a
  uniqueness constraint, on the email. AC-3a, AC-3b and AC-7a are the criteria it said would be
  needed. **Nothing constrains the full name, and no criterion here refuses a duplicate one.**

  **This is the third consecutive ticket to make this assumption and be wrong** — `ROO-01` on
  `Room.code`, `DEV-01` on `Device.assetTag`, MEM-01 on `Member.email`. The process caught it three
  times out of three, which is the reassuring reading and the wrong one. `data-model.md` contains no
  field names by design, so `ba` has no source that could ever answer the question and every future
  entity story will make this assumption again. F-1 records it for the steward; it is not a change
  this ticket may make.
- **A-3 — The role is chosen from `USER`, `MANAGER` and `ADMIN` rather than typed (AC-2, AC-6).**
  `rbac-and-security.md` fixes `ROLE_RANK` as a three-value ordering; a free-text role would admit a
  value no rank comparison has a result for, which is the failure mode that document names when it
  requires capabilities to be rank comparisons.
- **A-4 — Creating a member creates no account, and this is the normal case rather than a degraded
  one (AC-2, AC-4).** `ADR-003` states it directly: `authUserId` is nullable and *a null means no
  login; it is not an error state*.
- **A-5 — The seeded data contains at least one member who occupies a seat.** AC-1 and **AC-10** need
  it, and it is the one Given in this story that **cannot be constructed** through any surface the
  system offers: this ticket writes no occupancy (out-of-scope item 3) and no `SEA` or `REG` ticket
  exists. `.ai/standards/data-model.md` records the seed as 2 rooms, about 12 seats, 3 members across
  the three roles, and 5 devices of which 2 are primary. INV-05 makes each primary device owned by its
  seat's occupant, so two occupied seats follow from the device counts and an occupied member is
  near-certain. **It is still an inference from counts, not a fact this story has read**, and it is
  singled out here because it is exactly the failure `ROO-01` took three amendments to clear — a Given
  naming a fixture state QA can neither observe (RULE-05) nor construct. If it does not hold, AC-10
  has no Given and this story must be amended, not worked around.
- **A-6 — The other three delete Givens are constructible, and do not depend on the seed at all.**
  Recorded because it is what makes AC-9 and AC-11 safe where AC-10 is not.
  **AC-9** — a member who occupies no seat and owns no device — is produced by AC-2: a newly created
  member occupies no seat, which AC-2 asserts, and owns nothing, because no path here confers device
  ownership. Create then delete is a closed loop inside this ticket.
  **AC-11** — a member who occupies no seat and owns at least one device — is produced by AC-2
  followed by `DEV-01`, which is `DONE`: its AC-2 creates a device with an owner chosen from the
  members the system holds, and its AC-4 changes an existing device's owner. Either reaches the state.
  **AC-1's second half** — a member who occupies no seat — is produced by AC-2 as well.
  QA therefore needs the seed for one criterion, not for four.
- **Q-2 — RESOLVED by F-2 at DESIGN.** It asked what a Member's required fields are, noted that this
  story may not read `src/**` (RULE-05) and that no registry or standards document names one, and
  predicted that the answer would make AC-2, AC-3, AC-5 and AC-7 *more specific, not different*.
  `tech-lead-design` transcribed the set — full name, email, role, all required; `id` minted by the
  seam; `groupId` always null — and the four criteria are amended to name them. The prediction held:
  no criterion changed its meaning and none was renumbered. The route is the same one `ROO-01` used
  for finding B2 and `DEV-01` recorded as its own `Q-1`, which is now three tickets on the same
  channel.
- **A-7 — The email format is checked, and that is a judgement rather than a transcription.**
  AC-3c and AC-7b refuse a malformed address. **Nothing in the model compels this**: the column is
  `String` with no format constraint, and `DEV-01` faced the identical choice on `assetTag` and
  declined it. It is adopted here on the three grounds F-3 sets out — the column's name fixes its
  meaning where `assetTag`'s does not; `ADR-003` makes the email the identifier an account is
  eventually linked against; and nothing downstream repairs an unreachable person the way an edit
  repairs a mistyped asset tag. Recorded as an assumption rather than presented as a requirement so
  that dropping it is visible as a decision. Reversing it removes AC-3c and AC-7b and nothing else.
- **Q-3 — May a Manager assign a role above their own?** Stated in full in the Permissions section.
  It is an `AUT` question and does not block MEM-01, which enforces no rank at all. It is recorded
  here so that the `AUT` ticket inherits it in writing rather than rediscovering it.

## Changelog

- `2026-08-23T08:56:30Z` — initial version, all sections. Raised by `ba`. Amended by `ba`. No
  clarification was requested and `consulted` is empty. Gate is **BLOCKED** on `Q-1`; AC-10 and AC-11
  are reserved placeholders and every other criterion is complete and unaffected by it.
  `invariants_touched` written as `[INV-01, INV-05, INV-06, INV-08]` — the three transcribed from the
  `features.md` row kept rather than narrowed, because narrowing them is what `Q-1` decides, plus
  INV-08 added with per-ID reasoning. `size_estimate` written as `M`.
- `2026-08-23T09:04:17Z` — section `Open questions`, `Q-1`: the fourth ground for the recommendation
  withdrawn, and the `Scheduling` row of the decision table corrected. Both asserted that a cascade
  would make MEM-01 wait for `DEV-01`. `DEV-01` reached `DONE` and merged as PR #7 on 2026-08-23,
  which discharges the collision entirely — `.ai/board/backlog.md` records the same thing. The
  ground is struck in place rather than removed, because a withdrawn argument that was labelled the
  weakest when it was made is more informative than one that was silently dropped. **No change to
  the recommendation, which rests on grounds 1 to 3.** No AC, no invariant ID, and no
  `size_estimate` changed. The gate stays BLOCKED on Q-1. Raised by `ba`. Amended by `ba`.
- `2026-08-23T09:19:29Z` — **`Q-1` resolved; gate moves from BLOCKED to PASS.** The operator answered
  `refuse`, issued as **INV-12** and recorded in **ADR-005**. Raised by `ba`. Answered by the
  operator. Amended by `ba`. Changed: front-matter `gate` BLOCKED to PASS, `blocking_reason` cleared,
  `next_state` ESCALATED to READY, ADR-005 added to `inputs_read`. **AC-10 and AC-11 stop being
  placeholders and become criteria**, keeping their reserved numbers — both cite INV-12, and both
  carry a naming clause that came from ADR-005 rather than from this story: the refusal must say what
  is blocking it, so AC-10 names each occupied seat and AC-11 states the device count. `Q-1`'s
  question about whether AC-1 must display devices owned is answered by that clause and AC-1 is
  unchanged. `invariants_touched` narrowed from `[INV-01, INV-05, INV-06, INV-08]` to
  `[INV-08, INV-12]`; INV-01, INV-05 and INV-06 are moved to the reasoned-not-engaged list marked
  *discharged by ADR-005* rather than deleted, so R8 can see why they left. The `Feature` transcription
  is refreshed — the `features.md` row now reads `INV-08, INV-12`, carrying both corrections this
  story argued for. A-5 is narrowed to the one Given that cannot be constructed, and **A-6 is added**
  recording that AC-9, AC-11 and AC-1's second half are constructible without the seed. Out-of-scope
  item 4 now permits reading a member's device count and still forbids every device write. **No
  acceptance criterion was renumbered, none was retired, and `size_estimate` stays `M`.**
- `2026-08-24T01:36:50Z` — **REWORK amendment. Closes F-1, F-2 and F-3, the three DESIGN findings
  routed to `ba` and marked *blocks QA*, which `06-test-report.md` finding 1 failed the QA gate on.**
  Raised by `tech-lead-design` at DESIGN. Confirmed by `qa` at QA. Amended by `ba`. **Five criteria
  added, none renumbered, none retired.**
  **F-1 — `Member.email` is `@unique`** (`prisma/schema.prisma:164`), so A-2 was false. A-2 is marked
  FALSIFIED in place rather than deleted, because it predicted its own falsification and asked DESIGN
  to check. Added **AC-3a** (create refused on a duplicate email) and **AC-7a** (edit refused on
  another member's email). Added **AC-3b**, which asserts that a case-differing email **is** accepted:
  `@unique` in Postgres is case-sensitive, and refusing the second row would be stricter than the
  model and invented. It is the only criterion in this story asserting that a refusal must *not*
  happen, and it exists because an over-strict check is invisible to every other test here.
  **F-2 — the field set, closing `Q-2`.** Full name, email and role, all required; `id` minted by the
  seam, `groupId` always null. AC-2, AC-3, AC-5 and AC-7 amended from *every required field* to the
  three named fields — more specific, not different, exactly as `Q-2` predicted. AC-5 gains the clause
  that a member's own unchanged email is not refused as a duplicate, without which AC-5 and AC-7a
  contradict each other. Out-of-scope item 5 records that the scaffold's Group column is dropped.
  **F-3 — the email format refusal.** Added **AC-3c** and **AC-7b**, and recorded as **A-7**, an
  assumption rather than a requirement: nothing in the model compels it, `DEV-01` declined the same
  choice on `assetTag`, and the three grounds for deciding the other way here are F-3's. Reversing it
  removes those two criteria and nothing else.
  **Lettered rather than numbered `AC-12` onward** so the eleven existing IDs keep their meaning and
  the twenty-one tests already mapped to them keep pointing at what they were written for. They are
  separate criteria rather than clauses inside AC-3 and AC-7 because each carries its own Given and
  When; folding four scenarios into one criterion produces the untestable AC that routed this ticket
  back here.
  **Not touched:** `invariants_touched` stays `[INV-08, INV-12]` — none of the three findings reaches
  an invariant, and `06-test-report.md` records both as held. `size_estimate` stays `M`: five refusal
  criteria on fields the surface already collects do not move a story that was sized from its scope
  and its eleven out-of-scope items. **F-4, F-5, F-6 and F-7 are not `ba`'s** — F-4 and F-5 route to a
  human, F-6 and F-7 to `tech-lead-design`, and nothing here answers them.
