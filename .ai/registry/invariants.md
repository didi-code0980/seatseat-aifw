---
doc_version: 1
last_updated: 2026-08-10
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

## How to use this file

**In a story.** The BA populates `invariants_touched` in `ticket.yaml` with the IDs a change could
plausibly affect. Empty is a legitimate answer and must be written as `[]`; absent is not.

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
