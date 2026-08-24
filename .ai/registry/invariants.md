---
doc_version: 5
last_updated: 2026-08-24
governed_by: [RULE-01, RULE-07, RULE-09]
---

# Domain invariants

These are the statements about the domain that must hold in every state the system can reach. They
are not requirements, not acceptance criteria, and not preferences. A requirement can be renegotiated
with a stakeholder; an invariant that stops holding means the data is wrong.

**This file was seeded once, by an agent, during the bootstrap run. From that moment it is
human-only.** RULE-01 applies to it and to everything else under `.ai/registry/**`. An agent that
believes an invariant is wrong, incomplete, or in conflict with a story stops with `gate: BLOCKED`
and names the invariant in `blocking_reason`. It does not edit this file, it does not author the ADR
itself, and it does not work around the invariant.

An invariant violation is not a bug to be reworked. Per RULE-07 it escalates to a human on first
occurrence and never enters REWORK, because the code being wrong and the model being wrong need
different people to decide what happens next.

## Ledger

| ID | Invariant |
|----|-----------|
| INV-01 | A seat has at most one occupant. |
| INV-02 | One person may occupy multiple seats. |
| INV-03 | Seat status is derived, never stored as a column. |
| INV-04 | A seat has at most one primary device. |
| INV-05 | A seat's primary device must be owned by that seat's current occupant. Enforced by a partial unique index — not expressible natively in Prisma; requires raw SQL at the migration level. |
| INV-06 | When an occupant exits a seat, that seat's primary device auto-downgrades to secondary. |
| INV-07 | Devices may exist unassigned in inventory. |
| INV-08 | There is no self-signup. Accounts are created by Manager or Admin only. |
| INV-10 | Within a room, no two seats may occupy overlapping grid cells. A seat's placement is a grid coordinate plus a rectangular footprint. |
| INV-11 | Deleting a room deletes its seats. The deletion is destructive and cannot be undone; the interface must obtain explicit confirmation naming the number of seats that will be lost. |
| INV-12 | A Member may not be deleted while they occupy a seat or own a device. The deletion is refused, not cascaded; the references are removed first. |

## Unissued IDs

| ID | Status |
|----|--------|
| INV-09 | Never issued. Never will be. |

Two candidates were considered and rejected as domain invariants:

- *A seat has one or two network ports; zero is invalid.* Enforceable in the Zod schema. A constraint
  that validation already catches does not need to occupy the invariant layer.
- *Self-release requires no approval.* A process rule, recorded in the glossary. It describes a
  workflow, not a constraint on data.

IDs are stable references cited from `02-design.md`, `04-review.md`, and `ticket.yaml`. They are
never renumbered and never reused. The next invariant issued will be `INV-13`.

This section exists so a later reader does not conclude a row went missing. Check D2 in
`scripts/check-docs.mjs` reads this section as its source of legitimately-unissued IDs, so prose
explaining the gap does not fail the audit.

## How to use this file

**In a story.** The BA populates `invariants_touched` in `ticket.yaml` with the IDs a change could
plausibly affect. Empty is a legitimate answer and must be written as `[]`; absent is not.

The list records what the change **could** affect, not what survives the mitigation. Choosing the
safest behaviour and then concluding no invariant is engaged is circular reasoning: the fact that the
behaviour had to be chosen is the evidence that the invariant was in play. Follow indirect chains —
an invariant reached through a cascade is still reached.

**In a design.** The Tech Lead states, per listed ID, which mechanism holds it: a database
constraint, a check inside `src/lib/data/`, or a UI affordance that makes the violating action
unreachable. A UI affordance alone is never sufficient for an invariant.

**In a review.** Check R8 requires the reviewer to reason through each ID in `invariants_touched`
individually and cite where it is held. "No invariants affected" without that reasoning is a failed
check, not a pass.

## Notes on individual invariants

**INV-03.** Because status is derived, no migration may add a `status` column to the seat table, and
no seed may write one. Any code that caches a status must be able to recompute it.

**INV-04 and INV-05 together** are the reason the schema needs raw SQL. A partial unique index
expresses INV-04 directly. INV-05 relates two rows in different tables and needs a constraint trigger
or an equivalent. Drafting that SQL is a design activity; applying it is a human activity (RULE-09).

**INV-06** is a consequence, not an independent rule: it is what INV-05 forces to happen when
occupancy ends. It is listed separately because it describes a write path that must exist, and a
write path that does not exist is not caught by a constraint that is never evaluated.

**INV-08** removes an entire route. There is no sign-up page, no invitation-acceptance flow that
creates an account, and no first-run bootstrap that self-registers. The login page authenticates and
does nothing else.

**INV-08's enforcement changed on 2026-08-24 and is now weaker than the words above imply. The
invariant text is unchanged; only what holds it changed.** ADR-006 replaced Better Auth with Supabase
Auth. Better Auth held this invariant with two controls in code — `disableSignUp: true` and the
absence of a route — either of which a reviewer could read and a test could assert. Under ADR-006 the
operator chose a client-side configuration flag in `localStorage`. `localStorage` is browser storage:
the value lives on the machine of the person it restrains, and one line in a developer console
changes it with no server-side trace. **This invariant is therefore currently held by intent rather
than by a control**, which is recorded as MD-14 with the fix shape. It is written here, in the
registry, because an invariant whose enforcement has quietly lapsed is worse than one that was never
claimed — a reader of the table above would otherwise assume a guarantee that does not exist.
**INV-10** is held at the data-access layer, not by a database constraint — no unique index expresses
"these two rectangles do not intersect". A `btree_gist` EXCLUDE constraint could, and is sketched in
`constraints.draft.sql`. Until it is applied, the invariant holds only because RULE-02 makes a write
that bypasses `src/lib/data/` a lint failure. That is a real weakness and it is stated here rather
than hidden. It matters most for the Layout Designer: overlap is the failure dnd-kit produces most
easily and the eye catches least reliably.

**INV-11** is the one invariant that permits data loss rather than preventing it. It is stated as an
invariant because the confirmation is the only thing standing between a mis-click and the permanent
loss of a room's occupancy history. `schema.prisma` declares `onDelete: Cascade` from Seat to Room,
so the database will comply silently — the guard has to live in the interface, and a rule that lives
only in the interface is exactly the kind that gets dropped in a refactor unless something checks for
it. R8 is that something.

Soft delete was considered and rejected: the operator chose a real delete. That choice is recorded
here rather than in a story, because every future ticket touching room deletion inherits it.

**INV-11 reaches devices, though its wording does not say so.** The chain: deleting a room deletes
its seats; deleting a seat is an occupant exit; INV-06 then applies to whatever primary device sat
there, and INV-04, INV-05, and INV-07 follow from where that device ends up. A room-delete ticket
therefore engages INV-04 through INV-07 indirectly, and INV-01 directly, because occupancy is
destroyed.

This chain is written down because it is invisible from INV-11's own text. A reviewer checking R8
against a room delete has to walk it, and a BA populating `invariants_touched` has to list the
indirect IDs as well as the obvious one. The first story written against this invariant listed none
of them.