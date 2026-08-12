---
doc_version: 2
last_updated: 2026-08-11
governed_by: [RULE-01, RULE-02, RULE-07, RULE-09]
---

# Data model

## Provider: Supabase, as hosted Postgres only

Postgres is hosted on Supabase (ADR-002). Nothing else about Supabase is used — not its auth, not
RLS, not realtime, not storage — and **Prisma is the only client**. Details and the two connection
strings are in `.ai/standards/integrations.md`.

Two consequences for anything written against this file:

**Authorization lives in `src/lib/data/`, in exactly one place.** RLS is deliberately switched off.
Two layers enforcing permissions is a drift source: the seam and the database would each be
authoritative, both would be edited, and the disagreement would surface as a row a user can see in
one code path and not another. That is a bug nobody can reproduce from the application code alone.

**The database is remote, so migrations go over a specific connection.** Supabase's transaction
pooler cannot hold advisory locks, and Migrate needs them. The direct URL is not an optimisation.

## Status: no schema exists

No `prisma/schema.prisma` was found at bootstrap, and no source document defines table columns,
relation names, or field types. **This file therefore contains no field names.** Inventing them is
prohibited, and a plausible invented field is more expensive to find later than a missing one.

Phase B produces a *draft* schema covering Room, Seat, Device, Member, Group, SeatAssignment,
SeatRequest, and the Better Auth tables. Per RULE-09 the draft is not applied and no migration is
run until a human approves it.

## What the schema must satisfy

Every invariant in `.ai/registry/invariants.md`, held by the strongest available mechanism.

| Invariant | Mechanism it needs |
|---|---|
| INV-01 | A uniqueness constraint on the current-occupancy relation. Not application logic. |
| INV-02 | The absence of a constraint. A person-to-seat cardinality limit would violate it. |
| INV-03 | The absence of a column. No `status` column on the seat table, ever, and no seed that writes one. |
| INV-04 | A partial unique index: one primary device per seat. |
| INV-05 | A constraint trigger or equivalent relating the primary device's owner to the seat's occupant. Not expressible in Prisma's schema language. |
| INV-06 | A write path that downgrades the primary device when occupancy ends. A constraint alone does not do this; it only refuses. |
| INV-07 | Nullable seat association on a device. |
| INV-08 | No route, no schema default, and no seed that creates an account outside Manager or Admin action. |
| INV-10 | A room-scoped overlap check inside `src/lib/data/` on every placement write. No index expresses it. |

INV-09 was never issued. The gap is deliberate and nothing was withdrawn — `.ai/registry/invariants.md`
lists it under `## Unissued IDs` and records why. IDs are never reused or renumbered.

## Seat placement — INV-10

A seat's placement is a grid coordinate **and a rectangular footprint**: `gridX`, `gridY`, `gridW`,
`gridH`. Four numbers, not two. The grid is deliberately finer than one cell per seat so a seat can
sit near its real-world position, which is exactly why a seat spans a block of cells rather than
occupying one.

INV-10 says no two seats in the same room may overlap. That is a predicate over *pairs* of
rectangles, scoped to a room — two seats overlap when their intervals intersect on both axes:

```
overlap(a, b)  ⟺  a.roomId = b.roomId
                  ∧ a.gridX < b.gridX + b.gridW  ∧  b.gridX < a.gridX + a.gridW
                  ∧ a.gridY < b.gridY + b.gridH  ∧  b.gridY < a.gridY + a.gridH
```

**No unique index expresses this.** A unique index enforces equality over a column set; overlap is an
inequality over four columns compared against every other row in the room. PostgreSQL can do it with
an exclusion constraint over a `box` or `int4range` pair, but that requires a generated geometric
column and `btree_gist`, which is a schema decision nobody has approved.

`TODO(verify):` until that decision is made, INV-10 is held by **a check in the data-access layer** —
a function in `src/lib/data/` that every placement write goes through, which loads the room's other
seats and refuses an overlapping rectangle. This is weaker than a constraint and the weakness is
real: a write that bypasses the seam bypasses the invariant. It is acceptable only because RULE-02
makes bypassing the seam a lint failure rather than a matter of discipline. If a direct-SQL write
path is ever introduced, INV-10 must move into the database first.

**Every LAY ticket lists INV-10 in `invariants_touched`**, so gate R8 forces a reviewer to reason
about it explicitly on any drag-and-drop work. That is the point: overlap is the failure dnd-kit
produces most easily and the one the eye catches least reliably. Two seats one cell into each other
look right in a screenshot and are wrong in the data.

## The raw-SQL boundary

INV-04 and INV-05 are the reason this schema cannot be expressed in Prisma alone.

```sql
CREATE UNIQUE INDEX one_primary_device_per_seat
  ON "Device" ("seatId") WHERE "isPrimary" = true;
```

`TODO(verify):` the table and column names above come from the bootstrap specification, not from an
approved schema. They must be reconciled with the draft before any migration is written.

INV-05 needs more than an index because it relates two rows in different tables. A constraint trigger
is the usual instrument. Drafting it is a design activity; applying it is a human one.

Both live in a migration file as raw SQL, not in `schema.prisma`. That means `prisma db push` cannot
be the mechanism that creates them in any environment that matters, and a developer who resets their
database with `db push` will have a schema that accepts data the production schema rejects.

## Derived versus stored

INV-03 makes seat status derived. The general rule it exemplifies: if a value can be computed from
other rows, computing it is correct and storing it is a second source of truth that will diverge.

Deriving costs a query. Storing costs a class of bug where two parts of the system disagree about the
same seat. The second is worse, and it is worse in a way that only shows up in production data.

## DTOs and the seam

The types that cross `src/lib/data/` are DTOs in `src/lib/data/types.ts`, not Prisma models. The DTO
shape is decided by what the UI needs, not by what the tables look like. This is what allows the mock
implementation to exist before the schema does.

## Seeding

`prisma/seed.ts` and `src/lib/data/fixtures.ts` share fixture data so both modes render identically:
2 rooms, about 12 seats, 3 members across the three roles, 5 devices — 2 primary, 2 secondary, and 1
unassigned, which exercises INV-07.

A seed that cannot produce an INV-07 case is a seed that never exercises the unassigned path, and the
unassigned path is where inventory management lives.

## Changing this file

Human-only (RULE-01). A schema change additionally requires an ADR and human approval (RULE-09), and
a ticket whose `schema_delta` is anything other than `none` without a linked ADR fails Definition of
Ready.
