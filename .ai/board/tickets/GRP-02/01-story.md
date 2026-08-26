---
ticket: GRP-02
stage: SPEC
agent: ba
produced_at: 2026-08-26T03:07:43Z
inputs_read: [ .ai/board/tickets/GRP-02/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/glossary.md, .ai/standards/rbac-and-security.md, .ai/templates/story.md, .ai/templates/ticket.yaml, .ai/board/tickets/GRP-01/01-story.md, .ai/board/tickets/GRP-01/02-design.md, .ai/board/tickets/MEM-01/01-story.md, "branch: feat/GRP-02, cut from origin/main" ]
consulted:
  - with: operator
    asked: "Nothing was asked in this run, and nothing needed to be. `/spec GRP-02` was issued, returned gate BLOCKED claiming no ticket existed, and was reissued unchanged."
    answer: "No answer was given or required. The first run's claim was false: `ticket.yaml` was seeded by the orchestrator in 6ba81f4 and the worktree was parked on a stale origin/main that predated it. The reissue is recorded here because it is the only operator input this run received, and it is read as nothing more than a decision that GRP-02 proceeds. It is not an answer to Q-0, Q-2, Q-4 or Q-5 below, none of which were put."
    resulted_in_amendment: false
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: READY
---

# GRP-02 — Member assignment to groups

**Written against the ticket the orchestrator seeded**, not against a ticket this stage created. The
first `/spec GRP-02` of this session returned `gate: BLOCKED` on the ground that no ticket existed;
that was wrong, and it is corrected here rather than quietly — the worktree was parked on an
`origin/main` older than 6ba81f4, so `ticket.yaml` was invisible rather than absent. Its header is
the orchestrator's and is unchanged; this stage appended below it. Both instructions that header
gave SPEC are discharged and each says where: the group column cannot be restored by rendering
`Member.groupId`, and multi-group membership is `Q-5` rather than a decision taken here.

**This is the other half of a split the operator made, not a new idea.** GRP-01 built the group tree
and deliberately built no way to put a person in it; its out-of-scope items 1 and 2 name `GRP-02` as
the destination for both the assignment and the group column that MEM-01 dropped. This story
transcribes that destination rather than composing one.

Every acceptance criterion below derives from `.ai/registry/features.md:129`, the **Group** entry in
`.ai/registry/glossary.md`, `.ai/registry/invariants.md`, `.ai/standards/rbac-and-security.md`, and
the two prior stories named in `inputs_read`. No criterion originates in a tracker description
(RULE-17) or in `src/**` (RULE-05, never read). Where a prior *design* is cited it is cited as a
statement of fact about a shipped surface, not as a source of scope.

**One thing is stated up front because it changes how the rest reads.** GRP-01 shipped with no
permission gate and there is still no session, no `Member.role` to compare and no `AUT` feature —
the sign-in feature was withdrawn from the registry on 2026-08-25. So while this ticket is the
current state of the code, **anyone who can reach the application can move any person into any
department.** The Permissions section records the model this surface is intended to have. No
criterion here asserts it.

## Feature

Transcribed from `.ai/registry/features.md:129` without paraphrase:

| ID | Status | Title | Description | Group | Invariants touched |
|----|--------|-------|-------------|-------|--------------------|
| GRP-02 | PLANNED | Member assignment to groups | Assign and re-assign a Member to a Group, and restore the group column to the members list. | GRP | [] |

The `Description` is itself a transcription — the row records that it was taken from GRP-01's
out-of-scope item 1 and `02-design.md:435`, not composed. **Two verbs and one column** is therefore
the whole of the scope, and the Out of scope section below is mostly the work of holding that line.

## User value

A Manager or Admin can currently create a person and create a department and has no way to say that
the person is in the department. `Member.groupId` exists and is written by exactly one code path
today — GRP-01's AC-13, which sets it to null when a group is deleted — so the only transition the
system can perform on group membership is losing it. This ticket makes the field reachable in the
direction that carries information, and makes the result visible: the members list currently shows
no group at all, because MEM-01 dropped a column that displayed a raw id and no seam function
resolved it to a name. Until both halves exist, *which department is this person in* is a question
the system holds the answer to and cannot be asked.

## Acceptance criteria

Each criterion has an ID and is observable from outside the system. **AC-8 through AC-11 are
refusals and non-effects**, and they carry the same weight as the successes: the invariants and the
scope boundary both live there.

**AC-1 — The members list shows each member's group by name**
- Given a member who belongs to a group named `Platform`
- When a Manager or Admin opens the members list
- Then that member's row shows `Platform`
- And it shows the group's name, never its identifier

**AC-2 — A member who belongs to no group is shown as belonging to no group**
- Given a member whose group is not set
- When a Manager or Admin opens the members list
- Then that member's row shows an explicit empty state in the group column
- And the empty state is distinguishable from a group whose name is blank, which AC-4 of GRP-01 makes
  unreachable

**AC-3 — A member with no group is assigned to one**
- Given a member who belongs to no group, and at least one group exists
- When the assigning actor chooses a group for that member and confirms
- Then the member belongs to that group
- And the members list shows that group's name on that member's row without a manual reload

**AC-4 — A member is re-assigned from one group to another**
- Given a member who belongs to `Engineering`, and a group `Platform` exists
- When the assigning actor chooses `Platform` for that member and confirms
- Then the member belongs to `Platform` and no longer belongs to `Engineering`
- And no other member's group changes

**AC-5 — Only groups that exist may be chosen**
- Given the group tree as GRP-01 renders it
- When the assigning actor opens the group chooser for a member
- Then every group in the tree is offered, including groups nested beneath other groups
- And nothing outside that tree is offered, and the chooser is not a free-text field

**AC-6 — Assignment is refused when the chosen group no longer exists**
- Given a member, and a group that was deleted after the chooser was opened
- When the assigning actor confirms that choice
- Then the assignment is refused with a message saying the group no longer exists
- And the member's group is unchanged

**AC-7 — A member belongs to at most one group**
- Given a member who belongs to `Engineering`
- When that member is assigned to `Platform`
- Then the member belongs to `Platform` alone
- And no surface offers a way to hold both at once

*This criterion writes the glossary's narrower reading and is the one criterion here that a human
answer could withdraw — see `Q-5`. It is written as a criterion rather than left open because a
ticket about assignment that does not say how many groups an assignment produces is not buildable;
it is cross-referenced to `Q-5` rather than settled because choosing many-to-many is a schema change
and RULE-01 territory.*

**AC-8 — Assigning a member changes nothing else about that member**
- Given a member with a name, an email, a role, a seat and a device
- When that member is assigned to a group or re-assigned between groups
- Then the member's name, email and role are unchanged
- And their seat occupancy and device ownership are unchanged

**AC-9 — Nothing on this surface deletes a Member (INV-12)**
- Given any member, in any group or none
- When the assigning actor uses every control this ticket adds
- Then no member is deleted by any of them
- And no control on this surface offers to delete one

**AC-10 — Nothing on this surface creates, renames, moves or deletes a group**
- Given the group tree
- When the assigning actor uses every control this ticket adds
- Then the set of groups, their names and their parents are all unchanged
- And the group tree is only read by this surface, never written

**AC-11 — Nothing on this surface touches a seat, a device, a room or an occupancy**
- Given a member who occupies a seat and owns a device
- When that member is assigned to a group or re-assigned between groups
- Then no seat, device, room or occupancy record is created, changed or removed
- And the glossary's *two members of the same group need not sit near each other* remains true of
  the data afterwards

## Invariants touched

**`[]` — considered, and none engaged.** Written explicitly, because absent is not an answer and
check R8 has nothing to reason through when the field is missing.

`.ai/registry/invariants.md` instructs that the list records what the change **could** affect, that
choosing the safe behaviour and then declaring nothing engaged is circular, and that indirect chains
must be followed. Each ID was walked individually rather than dismissed as a class:

| ID | Subject | Reached? |
|----|---------|----------|
| INV-01 | A seat has at most one occupant | No. This ticket writes no occupancy. AC-11 is the criterion. |
| INV-02 | One person may occupy multiple seats | No. Same reason. Group membership imposes no seat rule; the glossary states group membership is independent of seat occupancy. |
| INV-03 | Seat status is derived, never stored | No. No status is read, computed or stored. |
| INV-04 | A seat has at most one primary device | No. No device is written. |
| INV-05 | A primary device must be owned by the seat's occupant | No. Neither ownership nor occupancy changes, so the pair this constrains cannot be pulled apart. |
| INV-06 | Exiting a seat downgrades its primary device | No. No occupant exits a seat. |
| INV-07 | Devices may exist unassigned | No. No device is assigned or unassigned. |
| INV-08 | There is no self-signup | No. This ticket creates no account and no member. |
| INV-10 | No two seats overlap in a room | No. No seat is placed or moved. |
| INV-11 | Deleting a room deletes its seats | No. No room is deleted. |
| INV-12 | A Member may not be deleted while occupying a seat or owning a device | **No, and this is the one that needed the argument.** INV-12 governs member *deletion*. This ticket performs one write on a Member — a nullable scalar reference to a Group — and deletes nothing; AC-9 is the criterion. GRP-01 reached the same conclusion from the other side when `Q-2` answered *detach*, and its `invariants_touched` is `[]` in the operator's own feature row. |

**The chain that had to be checked and does not exist.** INV-11's note is the worked example of an
invariant reached invisibly: deleting a room deletes seats, which is an occupant exit, which engages
INV-06, INV-04, INV-05 and INV-07 in turn. The equivalent question here is whether writing
`Member.groupId` cascades into anything. It does not, and the reason is in the registry rather than
in the code: the glossary states that **group membership is independent of seat occupancy**, so there
is no relation from a Group to a Seat, a Device or a Room for a cascade to travel along. That
sentence is what makes `[]` a finding rather than an assumption.

**This ticket does not therefore claim to be low risk.** It claims to be outside the invariant layer.
The risk it does carry is in the Permissions section and is a real one.

## Permissions

**One cell in this table is open, and it is the cell this ticket is about.**

GRP-01's `Q-6` was answered `ADMIN only` by the operator, on the ground that *the department
structure is a core organization-level resource* and the Manager scope does not extend to
restructuring it. That answer named four verbs — create, rename, move, delete — and assignment was
not among them, because assignment was already deferred to this ticket. So the answer does not
settle this ticket by extension, and reading it as though it did would be inventing the operator's
position on a question they were not asked.

The competing reading is equally grounded. `.ai/standards/rbac-and-security.md` gives Manager
*approve requests, assign seats, manage accounts, members, and devices*, and assigning a member to a
group is a write on a Member, not on a Group — a Manager who may change a member's role, which is the
value every rank comparison in the system is made against, plainly may change which department they
sit in.

| Actor | See the members list | Assign a member to a group | Re-assign between groups |
|---|---|---|---|
| `ADMIN` | yes | yes | yes |
| `MANAGER` | yes | **open — `Q-2`** | **open — `Q-2`** |
| `USER` | no | no | no |
| Unauthenticated | no | no | no |

`ADMIN` is `yes` by *Admin: everything*. `USER` is `no` on every column for MEM-01's reason: *manage
their own devices* is the whole of the User scope that touches this data and it is a device
capability. Whether a User may see their **own** group is not answerable from the registry and is not
assumed; it belongs to `AUT` with MEM-01's out-of-scope item 1.

`Q-2` does not block. **Nothing enforces any row of this table today** — there is no session and no
rank to compare — so the open cell costs nothing until the ticket that builds the gate, and it is
recorded here so that ticket inherits a question rather than a guess. When the gate is built it
belongs in the server action on every column above, not only in the UI: `PermissionGate` hides a
control and does not protect an operation.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Creating, renaming, moving or deleting a group.** All four shipped in GRP-01, which is `DONE`
   and merged as PR #42. AC-10 is the criterion; this is the scope statement. A control on this
   surface that creates a group *while assigning* — the convenient one — has left this ticket.
2. **Removing a member from a group without putting them in another one.** The feature row says
   *assign and re-assign* and names no third verb, so no criterion above asserts one and none refuses
   one either. It is `Q-4`, and it is deliberately not assumed in either direction: building it would
   be inventing a verb, and forbidding it would be inventing a refusal.
3. **A member belonging to more than one group.** AC-7 fixes it at one, on the glossary's *a Member
   belongs to a Group*, and `Q-5` routes the question to the operator rather than treating the
   glossary's singular as a decision this stage may take. If many-to-many is wanted it is a schema
   change and an ADR, not a control — which is precisely why it is not chosen here.
4. **A group-scoped view of members.** *The members of this group*, a member count on a group row, a
   filter or a group-by on the members list, or any navigation from the group tree to the people in
   it. GRP-01's out-of-scope item 2 covers the same ground and this ticket restores exactly one
   column and no view.
5. **Bulk assignment.** Moving a whole team at once, multi-select on the members list, drag from the
   member list onto the group tree, import from a file. One member at a time is what AC-3 and AC-4
   describe.
6. **A depth limit on nesting, and the order of siblings.** GRP-01's out-of-scope items 7 and 10.
   AC-5 offers the tree as GRP-01 renders it and asserts nothing new about its shape.
7. **A group carrying a role, a permission or a capability.** GRP-01's out-of-scope item 5, and it is
   sharper here: this is the ticket that makes group membership real for a person, so it is the first
   point at which *the Platform group may approve requests* becomes a sentence someone could try to
   implement. Authorization is a rank comparison over `Member.role` and nothing else. A group that
   granted anything is a second authorization model and needs an ADR.
8. **Any history of assignment.** When a member joined a department, who moved them, where they were
   before. GRP-01's out-of-scope item 9 recorded the same absence for the tree itself, and F-1 of its
   design confirmed a Group has no `createdAt` or `updatedAt`. *Who moved this person* is
   unanswerable after this ticket, and that is stated rather than omitted.
9. **Anything about seats, devices, occupancy or rooms.** AC-11 is the criterion.
10. **Any schema change.** `schema_delta` is `none` and `requires_adr` is `false`. `Member.groupId`
    already exists and is already written by GRP-01's delete path. **If assignment turns out to need
    a column or a constraint the model does not have, this ticket stops rather than acquiring a
    migration at DESIGN or IN_PROGRESS** — approving a schema change is permanently human under
    RULE-09. This is GRP-01's out-of-scope item 11 inherited verbatim, and it is the item most likely
    to be tested, because item 3's many-to-many reading is exactly a schema change wearing a feature's
    clothes.
11. **Enforcing the Permissions table.** No rank gate is built here, for the reason given in that
    section: there is nothing to gate against.
12. **Tracker synchronization.** `sync_enabled` is `false` and the tracker is never on the critical
    path (RULE-10). `/sync-tracker` owns it.

## Size

**`size_estimate: M`.** Estimated from this story's scope and the Out of scope section above, not
from an implementation — `size` is the Tech Lead's at DESIGN, from the enumerated `allowed_paths`.

The grounds, because an estimate with no grounds cannot be argued with. This is not one field on one
form. It is **two halves on two surfaces**: a write path that does not exist at all today, and a
column that was removed on purpose and cannot simply be put back, because MEM-01 removed it precisely
*because no seam function resolves a group id to a group name*. AC-1 requires the name. That
resolution is the work that makes AC-1 larger than it reads.

It is not `S`, for that reason. It is not larger than `M`, because the tree it reads is already
built, the field it writes already exists, `schema_delta` is `none`, and no invariant is engaged.

## Open questions

Items prefixed `Q-` are questions this story could not answer from the registry. **Nothing here
blocks**, and each names what it gates.

### Q-0 — OPEN — Should the GRP-02 feature row exist at all?

**Routed to:** the operator, through the steward. **Blocks:** nothing. **Would unmake:** this ticket.

`.ai/registry/features.md:129` objects to itself, in the operator's own repository, and the objection
is not this story's to overrule. It records that `PLANNED` was **forced rather than chosen**:
`RECOMMEND` is the honest status for work nobody has scheduled, ADR-008 clause 3 gives `RECOMMEND` no
ID by design, and check D1 needs an ID to resolve — the row existed within minutes of D1 failing
against four of GRP-01's gate-passed artifacts, all of which cite `GRP-02`, with CI red and PR #42
unable to merge. The row then names its own alternative: *if the intent is that GRP-01's artifacts
should not have cited an unissued feature at all, the repair is a steward change to D1 and this row
should be refused.*

It is raised rather than proposed, because both branches are RULE-01 territory. It is recorded as
non-blocking because the operator issued `/spec GRP-02` twice, and the second issue is read as the
decision that this ticket proceeds. **That reading is narrow on purpose.** A reissued command is a
decision about *this ticket*, not an answer to a governance question about a check — and if the
answer to Q-0 turns out to be *refuse the row*, this story and its branch are discarded, which costs
one branch and no merged code.

### Q-1 — ROUTED TO DESIGN — Does the seam have a writer for `Member.groupId`, and does it resolve a group name?

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing. **Blocks `/qa`:** yes.

Two facts this story needs and may not read (RULE-05): whether any function in `src/lib/data/` writes
`Member.groupId` other than GRP-01's delete path, and whether anything resolves a group id to a group
name for AC-1. MEM-01's out-of-scope item 5 says of the second that *no seam function resolves one*,
which was true when it was written and is the reason the column was dropped. GRP-01 added
`listGroups`, `getGroup` and `listChildGroups`, so the second may already be answerable by composing
what exists rather than by adding to the seam. DESIGN transcribes the real answer.

This gates `/qa` rather than DESIGN because AC-1's *by name, never its identifier* is a behavioural
claim QA has to be able to test, and QA reads this story and design section 6 only.

### Q-2 — OPEN — May a Manager assign a member to a group?

**Routed to:** the operator. **Blocks:** nothing today.

The full argument on both sides is in the Permissions section rather than here, because it is a
statement about the intended model and belongs where a reader looks for one. In one line: GRP-01's
`Q-6` put the four group *write* verbs at `ADMIN` only, and this is a write on a **Member**, which
`.ai/standards/rbac-and-security.md` places inside the Manager scope.

It does not block because nothing enforces a rank anywhere in the system today. It is recorded so
that the ticket which first builds the gate inherits an open question rather than a cell someone
filled in from the neighbouring ticket.

### Q-3 — ROUTED TO DESIGN — Which surface holds the assignment control?

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing. **Decides:** `allowed_paths`.

The feature row names the members list for the column and names no surface at all for the two verbs.
Both readings are consistent with every criterion above: a control on the member surface — a chooser
in the member edit form, or on the row — or a control on the group surface. AC-3 and AC-4 are written
so that neither is presupposed; they say *the assigning actor chooses a group for that member*, which
is true of both.

This is DESIGN's to decide and it decides `allowed_paths`, which is the practical consequence: the
member surface belongs to `MEM`, and a design that puts the control there writes files this ticket's
group has not touched before. That is not an objection — GRP-01's design already recorded that
`GRP-02` *makes `/members` a second reader and must add the path in the same change* — but it is the
reason the question is asked before `allowed_paths` is filled rather than after.

### Q-4 — OPEN — Is there a way to remove a member from a group without assigning another?

**Routed to:** the operator. **Blocks:** nothing. **Is:** out-of-scope item 2.

The feature row says *assign and re-assign*. A third verb — *remove from group*, returning the member
to the unassigned state that MEM-01 creates every member in and that GRP-01's AC-13 puts them back
into on a group delete — is neither granted nor refused by those words. This story does not invent it
in either direction: no criterion above builds it, and no criterion above refuses it.

It is worth an answer rather than silence because the state is reachable by accident and not by
intent. A person put in the wrong department can be moved to the right one, but a person put in a
department who belongs in none can only be moved to another wrong one — unless the group is deleted,
which is a very large lever for a small mistake.

### Q-5 — OPEN — May a Member belong to more than one Group?

**Routed to:** the operator, through the steward. **Blocks:** nothing. **Would withdraw:** AC-7, and
with it out-of-scope item 3.

`ticket.yaml`'s header names this as one of two questions GRP-01 refused to answer, and states that
it *presses harder here than it did on GRP-01, because assignment is exactly where a second group
would have to be expressible* — and that if the story needs it answered it goes under OPEN QUESTIONS
and routes to a human, **not chosen**. This section is that routing.

What the registry actually says is one sentence: `.ai/registry/glossary.md` — *A Member belongs to a
Group*. Singular, and it is the narrower of the two readings it will bear. AC-7 writes that reading
down. Taking the narrower reading of a registry sentence is transcription and this story is
comfortable doing it; what it is **not** willing to do is present the transcription as the answer,
because the two readings differ by a schema change and the glossary was not written to settle a
cardinality question.

The asymmetry that makes the narrow reading the safe default while the question is open: a system
that permits one group can be widened later without any existing row becoming wrong, while a system
that permits several cannot be narrowed without deciding which one to keep for every member who has
more than one.

## Changelog

- `2026-08-26T03:07:43Z` — story created at SPEC. Raised by `ba`. Amended by `ba`.
- `2026-08-26T03:07:43Z` — sections *front-matter*, *heading note*, AC-7, out-of-scope item 3 and
  `Q-5` corrected within the same run, before the gate. Two claims that this stage seeded its own
  `ticket.yaml` were false and are withdrawn: the orchestrator seeded it in 6ba81f4 and this stage
  appended to it. `Q-5` added, because `ticket.yaml`'s header requires multi-group membership to be
  routed to a human rather than chosen, and the first draft chose it in AC-7 with no question behind
  it. Raised by `ba`. Amended by `ba`.
