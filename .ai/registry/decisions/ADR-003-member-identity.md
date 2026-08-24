---
doc_version: 3
last_updated: 2026-08-24
governed_by: [RULE-01, RULE-09]
---

# ADR-003 — Member is a separate table from the Better Auth user

## Status

`ACCEPTED` — 2026-08-12, by the operator. **AMENDED by ADR-006 — 2026-08-24: the referent changed,
the decision did not.**

Better Auth was removed. Everywhere this document says "Better Auth's `user`", read Supabase's
`auth.users`. The decision itself is untouched and was not re-litigated: `Member` is still its own
table, still carries a nullable one-to-one link to the identity provider's user, and a Member without
that link is still a person the organization tracks who cannot sign in. The title of this ADR names a
library that no longer exists in the project and is deliberately not rewritten — renaming it would
make the file disagree with the pull request that accepted it.

**One mechanical detail moved with the referent.** `auth.users` lives in the `auth` Postgres schema,
not `public`, so the relation may not be expressible as a Prisma foreign key. ADR-006 OQ-3 decides
the column shape and recommends a plain unique UUID with no relation.

## Context

`prisma/schema.prisma` has been unapproved since Phase B on one open question: does `Member` map onto
Better Auth's `user` table, or sit beside it? The schema file names this as its own largest
unresolved item, and it blocked the DESIGN gate on ROO-01.

INV-08 says accounts are created by Manager or Admin only. That constrains who creates an account; it
says nothing about whether every Member must have one.

## Decision

`Member` is its own table. It carries `authUserId`, **nullable**, in a 1-1 relation to Better Auth's
`user`.

A Member without an `authUserId` is a person the organization tracks but who cannot sign in.

## Rationale

The deciding question was whether a Member needs to exist without a login. It does. Two cases make it
concrete: a staff member assigned a seat and a device who never uses the system, and a person who has
left the organization whose occupancy history must survive their account.

Folding Member into `user` makes both impossible. Every seat assignment would require an account,
which contradicts INV-02's premise that occupancy is about people rather than about system users, and
deleting an account would take its history with it.

There is a second reason, smaller but not negligible: Better Auth owns the schema of its own tables.
Domain columns living there make the application's data model hostage to a library's migration
schedule.

The cost is real and accepted: every query joining identity to domain data crosses two tables, and
the two can drift — a `user` with no `Member`, or a `Member` whose `authUserId` points at a deleted
`user`. Those are integrity concerns for the seam layer to hold, not reasons to merge the tables.

## Consequences

- `Member.authUserId` is nullable and unique. A null means no login; it is not an error state.
- Deleting a Better Auth `user` must not delete the `Member`. The relation is `onDelete: SetNull`.
- `src/lib/data/` is responsible for the join. No component reasons about two identity sources
  (RULE-02).
- Account-creation flows (AUT group) create both rows, in that order, or neither.
- A `user` with no matching `Member` is an integrity defect, not a supported state. Worth a check
  once the AUT group exists.

## Revert condition

If it turns out every Member in practice has an account, and the null branch is never exercised after
a full release cycle, the tables can be merged — but only through a new ADR, because the merge is a
destructive migration and the nullable column is the only record that the question was ever asked.