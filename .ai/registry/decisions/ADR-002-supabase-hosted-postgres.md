---
doc_version: 2
last_updated: 2026-08-12
governed_by: [RULE-01, RULE-02, RULE-09]
---

# ADR-002 — Supabase as hosted Postgres only

## Status

`ACCEPTED` — 2026-08-11, by the operator.

## Context

Phase B scaffolded a self-hosted `postgres:16` container in `docker/docker-compose.yml`, with a named
volume and a healthcheck. Nothing has been migrated to it: `prisma/schema.prisma` is still a draft
awaiting approval under RULE-09, blocked on the unresolved question of whether `Member` maps onto
Better Auth's `user` table or sits beside it.

Because nothing depends on the container yet, changing the provider now costs a compose file and two
environment variables. After a migration it would cost a data move.

Three facts shape what follows:

- Authentication is already built on Better Auth and is scaffolded and working
  (`src/lib/auth/`, `src/app/api/auth/[...all]/route.ts`, `ROLE_RANK` in `permissions.ts`).
- Authorization is already centralised. RULE-02 makes `src/lib/data/` the only path to data, enforced
  by a `no-restricted-imports` lint rule and re-checked at review as R4.
- Supabase is a bundle. Adopting it for Postgres puts Supabase Auth, Row Level Security, realtime,
  and storage within arm's reach, each of which overlaps something this system already has.

## Decision

Postgres is hosted on Supabase. Supabase is used **as a hosted Postgres instance and for nothing
else**.

Authentication stays on Better Auth, unchanged. Supabase Auth is not adopted.

**Row Level Security is switched off by decision, not by omission.** `src/lib/data/` remains the
single place authorization is enforced.

**Prisma is the only database client.** No Supabase SDK is added. If a future ticket genuinely needs
one, it goes on the `no-restricted-imports` allow-list beside `@prisma/client`, importable only from
`src/lib/data/prisma/**` — the same exception path, decided in `02-design.md` section 3.

Supabase's pooler requires two connection strings: `DATABASE_URL` (port 6543, `?pgbouncer=true`) for
the running application, and `DIRECT_URL` (port 5432) for Migrate. Prisma 7 expresses this by which
reader gets which URL, not by two fields in one place — `prisma.config.ts` reads `DIRECT_URL`.

No migration is applied by this decision. The schema remains unapproved.

## Rationale

**Why hosted at all.** A container is a database that exists on one machine. Every environment past a
single developer's laptop needs a real host, and choosing one before the first migration is cheaper
than choosing one after.

**Why not Supabase Auth**, the obvious alternative. It would replace working code with equivalent
working code, and the replacement is not free: `ROLE_RANK` and `can()` are already the vocabulary of
the permission model, `PermissionGate` is built on them, and INV-08 — no self-signup — is currently
held by a Better Auth option plus the absence of a route. Re-establishing all of that on a different
provider is a migration with no acceptance criterion attached to it. Its cost is a rewrite of the
auth layer to reach the position we already occupy.

**Why RLS is off**, which is the decision most likely to be questioned. RLS is a genuinely good
control, and in a system where clients talk to the database directly it is the *only* control. This
is not that system.

Turning it on here would mean two layers enforce permissions: the seam and the database. Both would
be edited, by different people, at different times, and they would drift. The failure that produces
is a row a user can see through one code path and not another — a bug that cannot be reproduced by
reading the application code, because half the rule is in the database. Review check R6 asks whether
permission gating matches design section 2; with RLS active, an R6 pass would no longer mean the
permission model is correct.

One enforcement point that is wrong is a bug. Two enforcement points that disagree is a bug plus an
investigation. The seam is already the single path in, already lint-enforced, and already what R4 and
R6 are written against. RLS as defence in depth is the real cost of this choice, and it is accepted
knowingly, not overlooked.

## Consequences

**Easier.** No database container to run, start, or reset. Docker becomes optional for local
development, which removes it from the prerequisites for `pnpm dev` and `pnpm verify`. Migrations and
backups become someone else's operational problem.

**Harder, and these are real.**

- **Two connection strings that are not interchangeable.** Supabase's pooler runs in transaction
  mode and cannot hold the session state advisory locks and prepared statements need. A migration
  sent through port 6543 fails *intermittently*, which is worse than failing. This is now a thing
  every developer must get right, documented in `.env.example` and enforced only by that
  documentation.
- **No offline development against a real database.** `DATA_SOURCE=mock` is unaffected and remains
  the default, but anything requiring Postgres now requires a network.
- **The database is reachable from outside the application.** A connection string is enough. Without
  RLS, anyone holding one has full access, so credential handling carries more weight than it did
  with a container bound to localhost.
- **A tempting escape hatch is now one `pnpm add` away.** The Supabase SDK would work, would look
  reasonable in a component, and would bypass the seam entirely.
- **Vendor coupling**, though limited: the schema is plain Postgres and Prisma is the only client, so
  moving to another host is a connection-string change rather than a rewrite. That is a direct
  consequence of using none of the rest of Supabase.

## Revert condition

**If the application ever needs direct client-to-database access, this decision must be revisited**
— specifically the RLS half of it. The whole argument above rests on `src/lib/data/` being the only
path in. A browser talking to Supabase directly makes that false, and at that moment RLS stops being
redundant defence and becomes the only enforcement there is.

Any proposal, ticket, or design that introduces a Supabase client key into client-side code, or that
imports `@supabase/supabase-js` outside `src/lib/data/prisma/**`, requires a new ADR before
implementation, not after.

**The observable signal is the SDK entering the dependency tree by any route.** Check D12 in
`scripts/check-docs.mjs` watches both the `no-restricted-imports` pattern list and `package.json`.
Neither alone is the decision — the decision is that Prisma is the only database client. A dependency
added without a matching lint pattern is the more dangerous ordering, because the import would then
be unrestricted, and D12 covers it for that reason.

## Affected documents

| File | Change | doc_version |
|---|---|---|
| `.ai/standards/integrations.md` | New Supabase section; ClickUp is no longer the only integration; Docker recorded as optional | 1 → 2 |
| `.ai/standards/data-model.md` | Provider section; RLS-off rationale; direct-URL requirement | 1 → 2 |
| `.ai/standards/testing-standards.md` | Section on fixtures that share the implementation's assumptions | 1 → 2 |
| `docker/docker-compose.yml` | `db` service and `db-data` volume removed | — |
| `.env.example` | `DATABASE_URL` and `DIRECT_URL` with dashboard field names | — |
| `prisma.config.ts` | `datasource.url` reads `DIRECT_URL` | — |
| `prisma/schema.prisma` | Provider comment; no schema change | — |
| `package.json` | `db:*` scripts load `.env.local` via Node's `--env-file-if-exists` | — |
| `scripts/check-docs.mjs` | D11 ADR existence; D12 Supabase second-door detection | — |