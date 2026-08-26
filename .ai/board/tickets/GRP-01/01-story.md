---
ticket: GRP-01
stage: SPEC
agent: ba
produced_at: 2026-08-25T04:21:03Z
inputs_read: [ .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/registry/rules.md, .ai/registry/decisions/ADR-005-member-deletion-refused.md, .ai/registry/decisions/ADR-003-member-identity.md, .ai/standards/rbac-and-security.md, .ai/standards/data-model.md, .ai/templates/ticket.yaml, .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/99-questions.md, .ai/board/backlog.md, "branch: feat/GRP-01, cut from origin/main" ]
consulted:
  - with: operator
    asked: "Q-0 — GRP-01 is not a feature ID; the GRP table is empty. Is `Group CRUD UI` the first Groups feature, and here is the row drafted for a human to merge. Q-1 — deleting a group with child groups: refuse, cascade, or reparent. Q-2 — deleting a group with members: refuse, detach, or cascade. Q-4 — is a group name unique, and unique among what. Q-6 — may a Manager create, rename, move, or delete a group."
    answer: "Q-0 — scope approved as Group CRUD UI; member assignment deferred to GRP-02; feature row supplied verbatim with `[]` in the invariants column. Q-1 — refuse. Q-2 — detach, `Member.groupId` set to null, no member deleted, so `invariants_touched` is officially `[]`. Q-4 — sibling uniqueness: the same name is permitted under different parents and refused under the same parent. Q-6 — ADMIN only; restructuring departments is not in the Manager scope."
    resulted_in_amendment: true
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: READY
---

# GRP-01 — Group CRUD UI

**This story was BLOCKED and no longer is.** It was written against a feature ID that did not exist,
with two delete questions nothing in `.ai/registry/**` answered. The operator resolved `Q-0`, `Q-1`,
`Q-2`, `Q-4` and `Q-6` on 2026-08-25. Every question is kept below in full with its answer rather
than deleted — the reasoning that produced an answer is what a later reader needs, and a question
that is silently removed reads as one that was never asked.

Every acceptance criterion below derives from `.ai/registry/features.md`,
`.ai/registry/glossary.md`'s **Group** entry, `.ai/registry/invariants.md`, `ADR-003`, `ADR-005`, and
the operator's answers recorded under Open questions. No acceptance criterion originates in a tracker
description (RULE-17) or in `src/**` (RULE-05, never read).

**One question remains open and it does not block.** `Q-5` — whether the ancestor-cycle refusal
should be a domain invariant — is the operator's and gates nothing. `Q-3` and `Q-7` were DESIGN's,
both gated `/qa`, and both were answered on 2026-08-25 in `02-design.md`; each is kept below with its
answer. *This paragraph read "Two questions remain open" until that amendment; `Q-7` was opened after
it was written, so the count was already one behind.*

**`next_state` reads `READY` because that is the state this story is written toward. This story does
not put the ticket there.** DoR is the orchestrator's evaluation and the ticket is left at `SPEC`.

## Feature

Transcribed from the `GRP — Groups` table of `.ai/registry/features.md` without paraphrase:

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| GRP-01 | Group CRUD UI | GRP | PLANNED | [] | The first GRP row. Creates, lists as a tree, renames, moves parent, and deletes groups. Member assignment deferred to GRP-02. Q-1 resolved to Refuse, Q-2 resolved to Detach (INV-12 unengaged). |

**The row was written by the operator, in their own words, and transcribed into the registry
unchanged.** It differs from the draft this story carried while blocked in exactly one substantive
place — the invariants column reads `[]` rather than `INV-12` — which is the correct consequence of
`Q-2` resolving to detach. See *Invariants touched*.

**`GRP-02` is named by that row and has no row of its own.** Member assignment is deferred to it and
it does not exist yet; issuing it is a human step (RULE-01). Out-of-scope item 1 is what holds the
boundary in the meantime.

## User value

The system already records that a Member belongs to a Group — MEM-01 ships with `groupId` on every
member it creates, permanently null, and with the Group column deliberately dropped from the member
list because *a group id is not a group name and no seam function resolves one*. This ticket is what
turns that column into something real: an Admin can create the departments and teams the organization
actually has, arrange them the way they nest, rename one when it is renamed, and move one when it
moves. It does not yet put anybody into one — that is `GRP-02`, and it is out-of-scope item 1. The
value here is that the group side of *a Member belongs to a Group* stops being an id with nothing
behind it.

## Acceptance criteria

**Every criterion below is observable from outside the system, and every Given is constructible by
this ticket's own criteria.** That is deliberate and it is MEM-01's lesson paid forward:
`.ai/standards/data-model.md` records the seed as *2 rooms, about 12 seats, 3 members across the
three roles, 5 devices* — **no groups at all**. A criterion whose Given asserted an existing group
would assert a fixture fact QA can neither observe (RULE-05) nor construct, which is the defect that
sent ROO-01 back twice. Every Given below either needs nothing, or names a group created by AC-2 or
AC-3.

The one exception is AC-13, whose Given needs a member who belongs to a group. **This ticket builds
no way to put a member into a group** — that is out-of-scope item 1 — so QA cannot construct that
state through the interface. It is raised as `Q-7`, it is DESIGN's to answer, and it gates `/qa`
rather than this stage.

**"Group management screen" means the surface this ticket delivers.** DESIGN names its route; no
registry document names one and this story may not read `src/**`.

**A note on the lettered criteria.** AC-4a, AC-4b, AC-5a and AC-6a were added by the amendment that
answered `Q-4`. They are lettered rather than numbered `AC-14` onward so that the criteria already
written keep their numbers and their subjects stay adjacent — a uniqueness refusal on create belongs
next to create, not eleven criteria later. They are separate criteria rather than clauses inside AC-2,
AC-5 and AC-6 because each has its own Given and its own When, and folding them in produces the
untestable AC that routed MEM-01 back to this stage.

**AC-12 and AC-13 were reserved placeholders and are now criteria.** Their content is the operator's,
recorded under `Q-1` and `Q-2`, and transcribed here into the artifact language. They kept their
numbers through the change, which is why they were reserved rather than left to be appended.

### Read

**AC-1 — Groups are listed as the tree they are**
- Given I have created a group, and created a second group as its child
- When I open the group management screen
- Then every group the system holds is listed
- And each group is shown beneath its parent
- And a group with no parent is shown at the top level
- And a control to create a group is present

The nesting clause is not display polish. The glossary says *groups nest: a parent group contains
child groups*, and a surface that renders a flat list of names has not represented the domain — it
has represented half of it. A person cannot judge whether deleting a group is going to be refused
against a screen that hides which groups sit under it, and after `Q-1` that refusal is the specified
behaviour.

### Create

**AC-2 — A group is created at the top level**
- Given I am on the group management screen
- When I submit the create form with a name and no parent chosen
- Then the new group appears at the top level of the tree
- And it is shown as having no child groups
- And the outcome is confirmed to me without my having to reload the page

**AC-3 — A group is created as the child of an existing group**
- Given a group exists
- When I submit the create form with a name and that group chosen as the parent
- Then the new group appears beneath that group in the tree
- And that group is shown as having it among its children
- And the new group is not shown at the top level

**AC-4 — Creation is refused when the name is missing or blank**
- Given I am on the create form
- When I submit with the name empty or consisting only of whitespace
- Then no group is created
- And a validation message is shown against the name
- And the tree is unchanged

**AC-4a — Creation is refused when a group with that name already sits under the same parent**
- Given a group exists with a known name, either beneath a given parent or at the top level
- When I submit the create form with that same name and that same parent — or with that same name and
  no parent, when the existing group is at the top level
- Then no group is created
- And a validation message is shown against the name stating that the name is already used in that
  parent
- And the tree is unchanged

Two groups with no parent are siblings of each other, which is why the criterion states the top-level
case explicitly rather than leaving it to be inferred. A rule about *the same parent* that says
nothing about *no parent* is a rule with a hole in it at the one level every tree has.

**AC-4b — The same name is permitted beneath a different parent**
- Given a group named `Platform` exists beneath a group named `Engineering`
- When I create a group named `Platform` beneath a different group named `Product`
- Then both groups exist
- And each appears beneath its own parent
- And neither is changed by the other's creation

The operator's own example, and the criterion that makes `Q-4`'s answer falsifiable in the permitting
direction as well as the refusing one. A uniqueness rule tested only by its refusals passes just as
well when it is stricter than it was meant to be, and a global-uniqueness implementation would fail
this criterion and no other.

### Edit

**AC-5 — A group is renamed**
- Given a group exists
- When I change its name to a different one and save
- Then the tree shows the new name
- And the group keeps its place in the tree, its parent, and its children
- And no other group is changed in any respect

**AC-5a — Renaming is refused when a sibling already holds the new name**
- Given two groups exist beneath the same parent, or two groups exist at the top level
- When I rename one of them to the name the other holds
- Then no change is saved
- And a validation message is shown against the name stating that the name is already used in that
  parent
- And both groups keep the names they had

**AC-6 — A group is moved to a different parent**
- Given two groups exist at the top level, and one of them has a child
- When I change that child's parent to the other top-level group and save
- Then the child appears beneath its new parent
- And it no longer appears beneath its previous parent
- And its own children, if any, move with it

**AC-6a — A move is refused when the destination parent already holds a group with that name**
- Given a group named `Platform` exists beneath a group named `Engineering`, and another group named
  `Platform` exists at the top level
- When I attempt to move the top-level `Platform` to sit beneath `Engineering`
- Then no change is saved
- And a message states that the name is already used in that parent
- And both groups keep their places in the tree

The move path needs its own criterion because it reaches the same rule by a different route: a move
changes which groups are siblings without changing any name, so an implementation that checks
uniqueness only where a name is typed passes AC-4a and AC-5a and fails here.

**AC-7 — A group is moved to the top level**
- Given a group exists as the child of another group
- When I clear its parent and save
- Then it appears at the top level
- And it no longer appears beneath its previous parent
- And its previous parent still exists and is unchanged apart from no longer holding it

**AC-8 — A group may not be made its own ancestor**
- Given a group exists with a child group beneath it
- When I attempt to set that group's parent to its own child, or to itself
- Then no change is saved
- And a message states that the move is not allowed
- And the tree is unchanged

This is the one criterion in this story derived rather than transcribed, and it is flagged as such.
The glossary says groups *nest* and that *a parent group contains child groups*; a containment
relation in which a group contains itself through a chain of parents is not a nesting, it is a cycle,
and a tree with a cycle in it has no top level to render. The refusal is therefore entailed by the
definition rather than added to it. **Whether it is a domain invariant is a human's to decide and this
story does not propose one** — `.ai/registry/invariants.md` records two candidates already considered
and rejected on the grounds that *a constraint that validation already catches does not need to occupy
the invariant layer*, and this may well be a third. It is `Q-5`, and it is still open.

### Delete

**AC-11 — A group with no children and no members is deleted**
- Given a group exists that has no child groups and no member belongs to it
- When I delete it and confirm
- Then it no longer appears in the tree
- And every other group is unchanged, in name and in its place in the tree
- And no member is changed in any respect

Numbered `AC-11` deliberately, out of sequence, so that `AC-9` and `AC-10` keep the numbers their
subject earned and so that `AC-12` and `AC-13` sit next to the questions that reserved them.

**AC-12 — Deleting a group that has child groups is refused**
- Given a group `A` exists with at least one child group `B` beneath it
- When I delete `A` and confirm
- Then `A` is not deleted
- And a message states that its child groups must be deleted or moved first
- And the whole tree is unchanged

`Q-1`, answered *refuse*. The operator's grounds are recorded there in full: consistency with
ADR-005 — a team has its own reason to exist even when the department above it is dissolved — the
risk of a mis-click destroying a whole branch under a cascade, and the fact that a silent reparent
changes structure nobody asked to change while the system has no audit log to explain it afterwards.

**AC-13 — Deleting a group that has members detaches them**
- Given a group `A` exists with no child groups, and one or more members belong to it
- When I delete `A` and confirm
- Then `A` no longer appears in the tree
- And every member who belonged to `A` still exists
- And each of them keeps their recorded attributes, the seat they occupy, and the devices they own
- And each of them is now recorded as belonging to no group

`Q-2`, answered *detach*. `Member.groupId` returns to null — the state MEM-01 creates every member
in, and a state the system already holds and renders. **No member is deleted**, which is what keeps
INV-12 unengaged and what keeps the INV-11 chain from ever starting. This criterion is the only place
in this ticket that writes anything on a member, and out-of-scope item 1 is written around it.

### What must not happen

**AC-9 — Nothing on this surface deletes a Member (INV-12)**
- Given a member exists who belongs to a group, occupies a seat, and owns a device
- When I create, rename, move, or delete any group — including the group that member belongs to
- Then that member still exists
- And they still occupy the same seat and still own the same device
- And the only attribute of theirs that any criterion in this story may change is the group they
  belong to, and only through AC-13

The last clause is what changed when `Q-2` was answered. While the question was open this criterion
said *their recorded attributes are unchanged*, full stop; under *detach* that is false for the
members of the deleted group and true for everybody else, and a criterion that is false in a case the
implementation is required to produce is a criterion QA cannot write a passing test for. Narrowing it
to *deletes a Member* keeps INV-12's guarantee exactly and hands the group-membership change to
AC-13, where it is specified.

**AC-10 — Nothing on this surface touches a seat, a device, or an occupancy**
- Given the seats, devices, and occupancies the system holds are known
- When I create, rename, move, or delete a group
- Then no seat is created, changed, or removed
- And no device is created, changed, reassigned, or re-designated
- And no occupancy is created or ended

The glossary is explicit that *group membership is independent of seat occupancy; two members of the
same group need not sit near each other*. This criterion is that sentence made falsifiable. It is
also the criterion that keeps `allowed_paths` at DESIGN out of the seat and device surfaces, and with
`Q-2` answered it is what makes *detach* observably different from *cascade*: under detach the member
keeps the seat and the device, and this criterion is where that is asserted.

## Invariants touched

`[]` — **considered, none engaged.** Written explicitly, because `.ai/registry/invariants.md`
requires it: `[]` is a legitimate answer and absent is not, since check R8 has nothing to reason
through when the field is missing.

**This list narrowed, and it narrowed because a human answered a question rather than because this
story changed its mind.** It was written `[INV-12]` while `Q-2` was open, on the ledger's own rule
that the list records what a change *could* affect and that choosing the safe behaviour first and
declaring the invariant unengaged afterwards is circular. One of the three branches of `Q-2` was
*cascade the delete to the group's members*, and for any such member who occupies a seat or owns a
device that branch violates INV-12 outright. The operator answered *detach*. No member is deleted, so
INV-12 is not reached, and the conditional ID falls away — exactly as MEM-01's INV-01, INV-05 and
INV-06 fell away when ADR-005 answered its own delete question. `.ai/registry/features.md` carries
`[]` on the GRP-01 row for the same reason.

**Reasoned through and not engaged.** A group is a grouping of people. It has no seat, no device, no
room, no port, no placement, and no account, and no criterion above reads or writes one.

- **INV-01** (a seat has at most one occupant), **INV-02** (one person may occupy multiple seats),
  **INV-03** (seat status is derived, never stored) — no occupancy and no seat status is read,
  written, or cached. AC-10 asserts it. INV-03 would become engaged if this surface stored a
  per-group occupancy summary to avoid a query; out-of-scope item 3 forbids the view that would want
  one.
- **INV-04**, **INV-05**, **INV-06** (primary device cardinality, its ownership, and the downgrade on
  exit) — no device is created, assigned, designated, or released, and no occupant exits a seat.
  AC-10 asserts all three, and AC-13 asserts the seat and the devices survive the one write this
  ticket makes to a member.
- **INV-07** (devices may exist unassigned in inventory) — nothing here assigns or unassigns.
- **INV-08** (there is no self-signup; accounts are created by Manager or Admin only) — this surface
  creates no account and no Member. It is worth one sentence rather than none: a group is not a
  permission and belonging to one grants nothing, because `.ai/standards/rbac-and-security.md`
  answers every permission question by rank comparison over `Member.role`. A group that carried a
  role would be a second authorization model, and out-of-scope item 5 forbids it.
- **INV-10** (no two seats overlap within a room) — no seat is placed and no grid coordinate is read.
- **INV-11** (deleting a room deletes its seats, behind a confirmation naming the count) — no room is
  reachable from this surface. It was the precedent argued from under `Q-1` and it lost; the
  destructive cascade it models is the branch the operator rejected.
- **INV-12** (a Member may not be deleted while they occupy a seat or own a device) — **discharged by
  the answer to `Q-2`.** AC-9 asserts no member is deleted by anything this surface does, which is
  INV-12 left alone rather than upheld. It would return the moment anyone proposed cascading a group
  delete to its members, and that is why AC-9 is a criterion rather than a note.

`INV-09` is unissued and cannot be touched by anything.

**The indirect chain was walked and it now terminates immediately.** The ledger requires it: an
invariant reached through a cascade is still reached. The chain is *delete a group → its members →
their occupancy and devices*. Under *detach* it stops at the first link — the member is written, not
deleted, and the write changes one field that no invariant is about. Under *cascade* it would have run
the whole length of INV-11's. That difference is the entire content of `Q-2` and it is why the answer
changed this section rather than merely a criterion.

## Permissions

**Resolved by `Q-6`: creating, renaming, moving and deleting a group are `ADMIN` only.** The
operator's grounds are recorded under `Q-6`: the department structure is a core organization-level
resource, and the Manager scope in `.ai/standards/rbac-and-security.md` — *approve requests, assign
seats, manage accounts, members, and devices* — does not extend to restructuring it.

| Actor | Create | Rename | Move | Delete |
|---|---|---|---|---|
| `ADMIN` | yes | yes | yes | yes |
| `MANAGER` | no | no | no | no |
| `USER` | no | no | no | no |
| Unauthenticated | no | no | no | no |

**Two things this table does not settle, stated rather than left to be assumed.**

*Who may see the surface and read the tree* was not part of the answer, which named the four write
verbs. It is not asserted by any criterion here and it belongs to the ticket that first enforces a
rank. The glossary makes group membership a fact about a person, so a person who cannot see the
groups cannot see which one they are in — that is an argument, not a decision.

*Nothing enforces any of this today.* **This ticket enforces no permission gate, and there is
currently nothing it could enforce one against.** ROO-01, DEV-01, MEM-01 and SEA-01 all shipped under
the same condition, and it is worse than it was a day ago rather than better: the `AUT` sign-in
feature was withdrawn from the registry on 2026-08-25 for a product discussion, so there is no
session, no `Member.role` to read, and no rank to compare. Consequently, **while this ticket is the
current state of the code, anyone who can reach the application can restructure the organization's
group tree.** The table above records the model this surface is intended to have, for the ticket that
will implement it.

When that gate is built it belongs in the server action on every column above, not only in the UI.
`PermissionGate` hides a control and does not protect an operation.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Putting a member into a group, and taking them out.** The member side of *a Member belongs to a
   Group*. **Deferred to `GRP-02` by name, in the feature row itself.** No control on this surface
   sets `Member.groupId` — with exactly one exception, which is AC-13: deleting a group clears it to
   null for that group's members, because `Q-2` answered *detach*. That exception is a consequence of
   a delete, not an assignment capability, and a surface that grows a *move this person to another
   group* control has left this ticket. `GRP-02` does not exist yet; issuing it is a human step
   (RULE-01).
2. **Any group-scoped view of members.** *The members of this group*, a count on a group row, a
   filter on the member list, or a group column returning to the member screen. MEM-01 dropped that
   column deliberately and this ticket does not restore it. It needs item 1 first, because a
   group-scoped view of members is empty until members can be put into groups. **This one is worth
   re-reading against AC-13**, whose Given needs a member who belongs to a group: the state exists in
   the data and this ticket builds no way to reach it, which is `Q-7`.
3. **Anything about seats, devices, occupancy, or rooms.** AC-10 is the criterion; this is the scope
   statement. In particular *the seats occupied by the members of this group* is not a view this
   ticket builds, and the glossary's *two members of the same group need not sit near each other* is
   the reason it is not an obvious one.
4. **Group-scoped seat requests or approvals.** Whether a request routes to the requester's group
   manager is a `REG` question and needs both item 1 and a role.
5. **A group carrying a role, a permission, or a capability.** Authorization is a rank comparison
   over `Member.role` and nothing else (`rbac-and-security.md`). A group that granted anything would
   be a second authorization model arriving through the back door. If that is wanted it is an ADR,
   not a field.
6. **Moving a whole subtree by drag and drop.** AC-6 and AC-7 move a group by choosing a parent.
   dnd-kit is in the stack for the Layout Designer; a draggable tree is a separate feature row.
7. **Ordering siblings.** Two groups under the same parent have no specified order, and no criterion
   asserts one. If the display order matters it is a field and a feature row.
8. **Group ergonomics.** Search, filter, collapse and expand state persisted across visits,
   pagination, bulk create, bulk move, import and export, archiving, and soft delete or restore.
   AC-11, AC-12 and AC-13 specify a real delete.
9. **Group history.** When a group was created, who renamed it, where it used to sit in the tree.
   Named rather than omitted because *who moved this department* is the first question after a
   surprise, and the answer for GRP-01 is that the system does not record it. **It is also one of the
   operator's three grounds for answering `Q-1` refuse** — a silent reparent is unexplainable without
   an audit log — so the absence is load-bearing here rather than merely noted.
10. **A depth limit on nesting.** The glossary gives an example two levels deep — *a class contains
    several teams* — and states no maximum. This story neither imposes one nor asserts that any depth
    renders acceptably. AC-8 refuses a cycle, which is a different thing from a limit.
11. **Any schema change.** `schema_delta` is `none` and `requires_adr` is `false`. `Group` is in the
    Phase B draft per `.ai/standards/data-model.md`, and whether it carries a parent reference is
    `Q-3`. **If nesting turns out to need a column the draft does not have, this ticket stops rather
    than acquiring a migration at DESIGN or IN_PROGRESS** — `prisma/schema.prisma` is a DRAFT under
    RULE-09 and approving it is permanently human. The sibling-uniqueness rule from `Q-4` does not by
    itself force a schema change: INV-10 is the worked precedent for a constraint held at the data
    seam rather than by an index, and under `DATA_SOURCE=mock` there is no database to hold one
    anyway.
12. **Re-opening `Q-1`, `Q-2`, `Q-4` or `Q-6`.** All four are answered and the answers are criteria
    now. Stated as an out-of-scope item as well as a resolved question because *the delete branch got
    chosen at DESIGN because the story left room* is the failure this section exists to prevent, and
    an answered question is easier to quietly re-litigate than an unanswered one.
13. **Tracker synchronization.** `sync_enabled` is `false` and the tracker is never on the critical
    path (RULE-10). `/sync-tracker` owns it.

## Open questions

Items prefixed `Q-` are questions this story could not answer from the registry. **Nothing here
blocks.** `Q-0`, `Q-1`, `Q-2`, `Q-4` and `Q-6` are answered and are kept in full. `Q-3`, `Q-5` and
`Q-7` are open and each names what it gates.

### Q-0 — RESOLVED — `GRP-01` had no feature row

**Answered by the operator on 2026-08-25.** Scope approved as **Group CRUD UI**: the whole of tree
management in this ticket, with member assignment split out to `GRP-02`, inheriting the scope MEM-01
deferred. The operator supplied the row verbatim and it is transcribed into
`.ai/registry/features.md` unchanged and reproduced under *Feature* above.

The question was raised because `.ai/registry/features.md` is human-only under RULE-01 and instructs
at its own head that *an agent needing a change here stops with `gate: BLOCKED` and states the change
in `blocking_reason`*. The block did what it exists to do: the row that landed is the operator's
words, and the one substantive difference from the draft — `[]` rather than `INV-12` in the
invariants column — came from their answer to `Q-2` rather than from a BA's judgement. Human
approval of the registry change itself remains CODEOWNERS review on the pull request, which is how
RULE-01 is enforced.

### Q-1 — RESOLVED — Deleting a group that has child groups: refuse, cascade, or reparent?

**Answered `refuse` by the operator on 2026-08-25.** Written as **AC-12**.

Three grounds, recorded in the operator's terms:

- **Consistency with ADR-005.** A child team still has its own reason to exist even when the
  department above it is dissolved. This is the same reasoning ADR-005 used to refuse a Member delete
  — *a seat has no existence apart from its room, and a device does have existence apart from its
  owner* — applied to a third relation, and it puts a child group on the far side from a seat.
- **A cascade makes a mis-click capable of destroying a whole branch of departments.**
- **A silent reparent changes the tree's structure in a way the person did not ask for**, and the
  system has no audit log to explain it afterwards. Out-of-scope item 9 is that absence.

No invariant is issued for this. It is a specified refusal in a story, not a statement about data
that must hold in every reachable state, and issuing an invariant is RULE-01.

### Q-2 — RESOLVED — Deleting a group that has members: refuse, detach, or cascade?

**Answered `detach` by the operator on 2026-08-25.** Written as **AC-13**, and it is the reason
`invariants_touched` is `[]`.

The operator's grounds: the core philosophy shared by `ADR-003` and `ADR-005` is that a person exists
independently of a department — when the department is deleted the employee is still an employee of
the company. So deleting a group sets `Member.groupId` to null, which is the unassigned state every
member MEM-01 creates already sits in.

**The consequence the operator stated explicitly, and this story agrees with it after re-checking
each ID:** no member is deleted, so nothing in `.ai/registry/invariants.md` is engaged — not INV-12,
and not INV-01, INV-02 or INV-04 through INV-07, which a cascade would have reached through the same
chain INV-11 runs. `invariants_touched` is therefore `[]`, and the feature row carries `[]`.

### Q-3 — RESOLVED AT DESIGN — What fields does a Group have, and does it carry a parent reference?

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing. **Blocks `/qa`:** yes — discharged.

This story says *a name* and *a parent* because those are what the glossary describes, and it names no
field. `.ai/standards/data-model.md` states that it *contains no field names* and that inventing them
is prohibited; it also records that the Phase B draft schema covers `Group`. DESIGN transcribes the
real field set from the draft schema and the seam types — files this story may not read (RULE-05) —
and if the draft carries no parent reference, out-of-scope item 11 applies and this ticket stops
rather than acquiring a migration.

`Q-4`'s answer sharpens what DESIGN has to come back with: not only the field names but whether the
model enforces uniqueness at all, and on what.

**Answered on 2026-08-25 by `tech-lead-design`, in `02-design.md` finding F-1.** A Group is three
fields — `id`, `name`, and `parentId`, which is nullable. **The parent reference exists**, so
out-of-scope item 11's stop condition is not met: `schema_delta` stays `none`, `requires_adr` stays
`false`, and no migration is acquired. The DTO in the seam already carries exactly those three fields
and does not change.

Two consequences this story asked for by name. There is **no `createdAt` and no `updatedAt`** on a
Group, so out-of-scope item 9 — the system does not record when a group was created or who moved it —
is the model's state and not only this ticket's scope. And there is **no unique constraint of any
kind** on the model, which is what turns the second half of `Q-4` from a transcription into a
decision; see the answer recorded there.

### Q-4 — RESOLVED — Is a group name unique, and unique among what?

**Answered `sibling uniqueness` by the operator on 2026-08-25.** Written as **AC-4a**, **AC-4b**,
**AC-5a** and **AC-6a**.

Different branches may hold groups with the same name — `Engineering / Platform` and
`Product / Platform` are both valid — but two groups directly beneath the same parent may not share a
name. The operator's ground: that is how a real organization's tree behaves.

**Two residues, both for DESIGN and neither blocking.**

*Case.* The answer does not say whether the comparison folds case, and this story does not decide it.
MEM-01 settled the same question for `Member.email` by matching what the model does rather than being
stricter than it — *refusing the second would be stricter than the model and would be invented, and
it would be invented in the direction that is invisible, because a stricter refusal never produces a
wrong row, only a rejected one*. The same reasoning applies here and the same route: DESIGN
transcribes what the model enforces, and if case-folded identity is wanted it is a schema decision,
not a line in a Zod schema. It amends this story under RULE-14 when it is settled.

*Where it is held.* Sibling uniqueness is a composite rule — a name plus a parent, where *no parent*
is itself a case — and nothing says the model expresses it. It does not need to: INV-10 is the worked
precedent for a constraint held in `src/lib/data/` rather than by an index, and under
`DATA_SOURCE=mock` there is no database at all. Out-of-scope item 11 holds the line that this must not
turn into a migration acquired mid-ticket.

**This is the fourth consecutive ticket to reach DESIGN with the uniqueness question open**, after
ROO-01 on `Room.code`, DEV-01 on `Device.assetTag` and MEM-01 on `Member.email`. The difference is
that on this one the *rule* is decided before DESIGN and only the *enforcement* is unknown. MEM-01's
`99-questions.md` records why the pattern keeps recurring and that it is structural rather than
careless: the BA has no source that could ever answer it.

**Both residues answered on 2026-08-25 by `tech-lead-design`, in `02-design.md` finding F-2.** This
paragraph is written into the story rather than left in the design because the answer is a
*behavioural* fact that QA must test, and QA reads this story and design section 6 (RULE-05) — a rule
that lives only in design section 1 is a rule QA cannot see. The story asked for exactly this: *it
amends this story under RULE-14 when it is settled.*

*Case.* **The comparison is exact and is not case-folded.** `Platform` and `platform` may sit beneath
the same parent, and creating the second is a success rather than a refusal by AC-4a. The ground is
MEM-01's on `Member.email`: the model imposes no case rule on `Group.name` at all, so folding case
would be a rule the design invented, in the direction that never produces a wrong row and only a
rejected one. If case-folded identity is wanted it is a schema decision and it is human.

Names are **trimmed** before they are stored and before they are compared, so `  Platform  ` collides
with an existing `Platform`. That follows AC-4's blank-name refusal and is not a separate rule.

*Where it is held.* **In `src/lib/data/`, in one predicate called from both write paths** — INV-10's
precedent, as this question anticipated. What the design added to that precedent is that the index
would not merely have been unnecessary, it would have been **wrong**: PostgreSQL treats `NULL` as
distinct from `NULL` in a unique index, so `@@unique([parentId, name])` would refuse
`Engineering/Platform` twice and **permit two top-level `Platform`s**. AC-4a's top-level case is
exactly that row. This story's own sentence — *a rule about "the same parent" that says nothing about
"no parent" is a rule with a hole in it at the one level every tree has* — turns out to describe the
schema-held alternative rather than a drafting risk.

### Q-5 — OPEN — Should the ancestor-cycle refusal be a domain invariant?

**Routed to:** the operator, through the steward. **Blocks:** nothing.

AC-8 refuses a move that would make a group its own ancestor. The refusal is derived from the
glossary's *nest* rather than transcribed, and no invariant covers it. `.ai/registry/invariants.md`
records two candidates considered and rejected, one of them on the grounds that *a constraint that
validation already catches does not need to occupy the invariant layer* — which may well apply here.
It is raised rather than proposed, because issuing an invariant is RULE-01.

### Q-6 — RESOLVED — May a Manager create, rename, move, or delete a group?

**Answered `ADMIN only` by the operator on 2026-08-25.** Written into the Permissions table.

The operator's ground: the department structure is a core organization-level resource, and the
Manager scope in `.ai/standards/rbac-and-security.md` covers assigning seats, approving requests and
managing specific members and devices — not restructuring departments.

The answer names the four write verbs. Who may *see* the surface and read the tree was not part of it
and is recorded in the Permissions section as still unstated. Nothing enforces any of this today, and
that is stated there too rather than here.

### Q-7 — RESOLVED AT DESIGN — How does QA reach the state AC-13 needs?

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing. **Blocks `/qa`:** yes — discharged.

AC-13's Given is *a group with one or more members belonging to it*, and **this ticket builds no way
to put a member into a group** — that is `GRP-02` and out-of-scope item 1. QA may not read `src/**`
(RULE-05) and may not construct fixture state it cannot reach through the interface, which is exactly
the defect that sent ROO-01 back twice and MEM-01 back once.

Design section 6 is the only channel through which the answer may reach QA. It is DESIGN's to decide
and it has real options — a seeded fixture group with members, named in section 6 so QA can rely on
it; a seam-level test that does not go through the interface; or a note that AC-13 is verifiable at
unit level and not at e2e level. **What it must not be is silence**, because a criterion QA cannot
set up is a criterion that gets marked untestable at the gate rather than at the stage that could
have fixed it.

Raised by this amendment rather than at the original writing, because until `Q-2` was answered *detach*
there was no AC-13 to need the state.

**Answered on 2026-08-25 by `tech-lead-design`, in `02-design.md` finding F-3 and section 6.2. The
state already exists in the seed and nothing has to be constructed.** The seed holds **two groups** —
`Engineering` at the top level, and `Platform` beneath it — and **all three seeded members belong to
one of them**: one in `Engineering`, two in `Platform`. So the seed already contains a group with a
child and no way to be deleted (AC-12's Given), a group with no children and two members (AC-13's
Given), and three members who belong to a group, occupy a seat and own a device (AC-9's Given).

**This story's premise on that point was wrong, and it was wrong from a document.** The paragraph
above the acceptance criteria says the seed has *no groups at all*, citing
`.ai/standards/data-model.md`, which describes the seed as *2 rooms, about 12 seats, 3 members across
the three roles, 5 devices* and does not mention groups. The fixtures have held two since they were
written. **That is a defect in `.ai/standards/data-model.md`, which is human-only under RULE-01**, and
neither this story nor the design edits it. It is recorded here because the next reader to reason
about fixture state from that sentence will reach the same wrong conclusion. The paragraph is left as
written rather than corrected; this note is the correction.

The consequence for `/qa` is an **ordering** constraint rather than a missing fixture, and design
section 6.2 carries it: AC-13 consumes `Platform` permanently, so its test runs last, and AC-12 builds
its own Given rather than depending on `Platform` still being there.

## Changelog

- `2026-08-25T04:21:03Z` — initial. Eleven live criteria, two reserved on `Q-1` and `Q-2`.
  `invariants_touched` written `[INV-12]`, conditional on `Q-2`; `size_estimate` written `M`. Feature
  row drafted at `Q-0` and not written. Gate `BLOCKED`. Written by `ba`.
- `2026-08-25T05:56:12Z` — amendment under RULE-14, answering `Q-0`, `Q-1`, `Q-2`, `Q-4` and `Q-6`
  from the operator. Raised by `operator`. Amended by `ba`. Changes:
  - **Feature** — the row exists and is transcribed; the draft is retired. Written to
    `.ai/registry/features.md` verbatim as supplied.
  - **AC-12 and AC-13** stop being reserved placeholders and become criteria. No number reused.
  - **AC-4a, AC-4b, AC-5a, AC-6a** added for sibling uniqueness. Lettered so no existing ID moves.
  - **AC-9** narrowed from *no member's attributes change* to *no member is deleted*, because under
    *detach* the first is false for the deleted group's members and QA cannot write a passing test
    for a criterion the implementation is required to contradict.
  - **`invariants_touched`** narrowed `[INV-12]` to `[]`, written explicitly, and the feature row
    carries `[]` for the same reason.
  - **Permissions** — `Q-6` filled the four write columns as `ADMIN` only; surface visibility
    recorded as still unstated.
  - **Out of scope** — item 1 amended to carry AC-13's single exception and to name `GRP-02`; items
    9, 11 and 12 amended to record what the answers changed.
  - **`Q-7` opened** — AC-13's Given is unreachable through this ticket's own interface. It did not
    exist before AC-13 did.
  - Gate `BLOCKED` → `PASS`. `size_estimate` unchanged at `M`. No criterion removed.
- `2026-08-25T07:14:49Z` — amendment under RULE-14 at DESIGN, recording answers this story asked
  DESIGN to bring back. Raised by `tech-lead-design`. Amended by `tech-lead-design`. **No acceptance
  criterion is added, removed, renumbered or reworded, and the front-matter is untouched** — the gate
  and its record are the `ba`'s. Changes:
  - **`Q-3` RESOLVED** — three fields, the parent reference exists, `schema_delta` stays `none`.
    `02-design.md` F-1.
  - **`Q-4`'s two residues ANSWERED**, in this story rather than only in the design because they are
    behavioural facts QA must test and QA does not read design section 1: comparison is exact and
    case-sensitive, names are trimmed, and sibling uniqueness is held at the seam because a unique
    index would have permitted two top-level groups with the same name. `02-design.md` F-2. This is
    the amendment `Q-4` itself asked for.
  - **`Q-7` RESOLVED** — the seed already holds two groups and three members inside them, so AC-13's
    Given needs nothing built; what it needs is an ordering, which design section 6.2 states.
    `02-design.md` F-3.
  - **A defect recorded against `.ai/standards/data-model.md`**, whose seed description omits the
    groups the fixtures have always held. Human-only; not edited. The story paragraph that relied on
    it is left as written, with the correction under `Q-7`.
  - The preamble's *two questions remain open* corrected to one, `Q-5`. `Q-3` and `Q-7` keep their
    sections with `RESOLVED AT DESIGN` in the heading.
