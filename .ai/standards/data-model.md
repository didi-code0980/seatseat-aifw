---
doc_version: 3
last_updated: 2026-08-25
governed_by: [RULE-01, RULE-02, RULE-07, RULE-09]
---

# Data model

## Provider: Supabase — Postgres, the data client, and identity

Postgres is hosted on Supabase (ADR-002). **The client is Supabase's too, as of ADR-007
(2026-08-25), and identity is Supabase Auth as of ADR-006.** Realtime and storage remain out of
scope. Details, the package and exemption table, and the two connection strings are in
`.ai/standards/integrations.md`.

*This section previously read "as hosted Postgres only" and stated that Prisma is the only client.
Both were true from 2026-08-11 to 2026-08-25, and are recorded as struck rather than removed in
ADR-002 §Status.*

Three consequences for anything written against this file:

**Authorization lives in `src/lib/data/`, in exactly one place.** RLS is deliberately switched off.
Two layers enforcing permissions is a drift source: the seam and the database would each be
authoritative, both would be edited, and the disagreement would surface as a row a user can see in
one code path and not another. That is a bug nobody can reproduce from the application code alone.

**RLS stays off only while every Supabase client is server-side, and that is now the whole of what
holds it.** ADR-007 §4 and ADR-006 OQ-1 both answer server-side only. Under Prisma a browser import
failed at build time; `@supabase/supabase-js` runs in a browser perfectly, so the compiler no longer
backs the rule up. If a Supabase client ever reaches the browser, RLS becomes mandatory — ADR-007
§Revert condition, and it is automatic there rather than a judgement call.

**The database is remote, so migrations go over a specific connection.** Supabase's transaction
pooler cannot hold advisory locks, and migrations need them. The direct URL is not an optimisation.

## Status: no schema exists

No `prisma/schema.prisma` was found at bootstrap, and no source document defines table columns,
relation names, or field types. **This file therefore contains no field names.** Inventing them is
prohibited, and a plausible invented field is more expensive to find later than a missing one.

Phase B produces a *draft* schema covering Room, Seat, Device, Member, Group, SeatAssignment,
SeatRequest, and the Better Auth tables. Per RULE-09 the draft is not applied and no migration is
run until a human approves it.

**Two things about that sentence changed, and the RULE-09 half did not.** The Better Auth tables are
out — ADR-006 removes the provider, and `user`, `session`, `account` and `verification` never enter
the schema; the identity of record is Supabase's `auth.users`, which lives in the `auth` Postgres
schema, is not modelled here, and is reached from `Member.authUserId` as a plain nullable unique
string with no foreign key (ADR-003, ADR-006 OQ-3). And the draft's *language* changes: ADR-007 §6
moves schema authoring to SQL migrations under `supabase/migrations/`. **The human approval does not
change.** No migration has been applied, and the first one is a RULE-09 gate whichever tool writes
it.

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

**ADR-007 removes this divergence rather than mitigating it, and this section is the strongest single
argument that decision had.** Two artefacts that must agree, in two languages, with no tool
reconciling them, is a defect this file has documented since 2026-08-11. Under SQL migrations there
is one artefact, in the language the constraints always required, and `db push` no longer exists to
be misused. The `TODO(verify):` above still stands unchanged: the table and column names came from
the bootstrap specification, not from an approved schema, and must be reconciled before any migration
is written. Changing the tool does not reconcile them.

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

**"Both modes render identically" is the requirement, and ADR-007 makes it load-bearing rather than
convenient.** `DATA_SOURCE` becomes `"mock" | "supabase"` and defaults to `"supabase"` (ADR-007 §7),
so mock stops being the state you get by doing nothing and becomes the state tests opt into. A seed
that has drifted from the fixtures then produces a suite that passes against data the application
never shows anyone. Where the seed lives once `prisma/seed.ts` is gone is ADR-007's OQ-3, unanswered;
the recommendation on record is that `src/lib/data/fixtures.ts` stays the single source and the seed
writes it through the seam, because a hand-written SQL seed is a second copy and will diverge on the
first change.

A seed that cannot produce an INV-07 case is a seed that never exercises the unassigned path, and the
unassigned path is where inventory management lives.

## Changing this file

Human-only (RULE-01). A schema change additionally requires an ADR and human approval (RULE-09), and
a ticket whose `schema_delta` is anything other than `none` without a linked ADR fails Definition of
Ready.
