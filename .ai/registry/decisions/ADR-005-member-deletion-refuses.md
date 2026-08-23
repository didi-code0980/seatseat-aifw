---
doc_version: 2
last_updated: 2026-08-23
governed_by: [RULE-01, RULE-09]
---

# ADR-005 — Deleting a Member is refused, not cascaded

## Status

`ACCEPTED` — 2026-08-23, by the operator.

Answered as Q-1 during MEM-01's SPEC. The operator chose `refuse` from two written options, each
carrying its consequences. Recorded by the steward under ADR-004; the decision is the operator's and
the wording of the invariant is `ba`'s, transcribed.

## Context

MEM-01 needed to know what happens when a Member who occupies a seat, or owns a device, is deleted.
No invariant answered it. `ba` raised it rather than assuming, which is correct: INV-11 answered the
equivalent question for rooms and had to be **issued by a human** to do it.

Two shapes were available, and the room precedent made cascade the plausible default.

## Decision

**Refused.** A Member may not be deleted while they occupy a seat or own a device. The references are
removed first, then the Member may be deleted. Issued as **INV-12**.

## Rationale

Three arguments, each checked against the file rather than recalled.

**1. Cascade contradicts the definition of a Device.** `glossary.md:68` — *"A piece of equipment with
an owner."* Ownership is definitional, not optional. A cascade would have to either strand devices
with no owner, contradicting the definition, or delete the device rows — destroying the record of
physical assets because a personnel record changed. INV-07 permits an *unassigned* device, which is
about seats; it does not permit an *unowned* one.

**2. The registry says so out loud when it wants a destructive cascade.** INV-11 does not merely
permit deleting a room's seats — it mandates the cascade, states that it cannot be undone, and
requires the interface to name how many seats will be lost. That is what this ledger looks like when
it means cascade. It says nothing of the kind about Members. The argument is from silence, but the
silence is patterned: the registry has demonstrated it knows how to say this.

**3. ADR-003 built the Member table so departed people keep their history.** Its Rationale names the
case directly — *"a person who has left the organization whose occupancy history must survive their
account."* The system deliberately keeps a Member row for someone who has gone. Deleting the Member
is therefore not how a departure is modelled, and it is not the common path. Making the uncommon path
destructive buys nothing and costs the history the table exists to hold.

Stated precisely, because this argument is easy to overstate: ADR-003 protects a Member from *account*
deletion, not from its own. What it establishes is that the normal representation of a departed person
is a surviving Member row — which is what makes cascade-on-delete a solution to a problem the model
does not have.

## Consequences

`MEM-01` narrows to `invariants_touched: [INV-08, INV-12]`. The conditional INV-01, INV-05 and INV-06
fall away with this answer: they were on the row only because a cascade would have fired INV-06 by
downgrading a primary device.

**INV-12 must appear on MEM-01's row, not only INV-08.** MEM-01 is the ticket that implements member
deletion, so review check R8 has to cover the invariant this decision issues. A ticket that introduces
an invariant and does not list it is the one place R8 is guaranteed to miss.

MEM-01 also stops writing `src/lib/data/mock/devices.ts`, so its `allowed_paths` no longer overlap any
device ticket. Whether it parallelises is settled in the affirmative — though DEV-01 is already `DONE`,
so nothing collides today regardless.

The refusal needs a message that names what is blocking it. A bare "cannot delete" sends the operator
hunting; the seat code and device count are both available at the seam.

## Rejected alternative

**Cascade**, in INV-11's shape: deleting a Member releases their seat and auto-downgrades the primary
device via INV-06. It has real symmetry with the room case and would have been defensible.

Rejected because the room case is not analogous where it matters. A seat has no existence apart from
its room — deleting the room genuinely destroys the seat. A device has existence apart from its owner:
it is a physical object that outlives whoever was assigned it, and `glossary.md` defines it that way.
The symmetry is in the shape of the operation, not in the shape of the data.
