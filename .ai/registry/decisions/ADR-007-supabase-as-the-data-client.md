---
doc_version: 2
last_updated: 2026-08-25
governed_by: [RULE-01, RULE-02, RULE-09]
---

# ADR-007 — Supabase as the data client, and the cutover off mock

## Status

`ACCEPTED` — 2026-08-25, by the operator.

The operator's instruction, verbatim, answering OQ-1 of
`.ai/board/ideas/2026-08-25-supabase-consolidation-scope-unsettled.md`:

> *"B và C. Chuyển sang dùng DB trên supabase + auth của supabase. Chuyển mock data sáng db thật"*

The idea offered three readings of *"database đang dùng sang dùng hẳn trên supabase"* and asked for a
single letter. The answer names two of them, and both are recorded here:

- **B** — replace Prisma with the Supabase client as the data-access path.
- **C** — stop running on mock fixtures and run against the hosted Supabase Postgres.

ADR-002 requires this document to exist **before** implementation, not after: *"Any proposal, ticket,
or design that introduces a Supabase client key into client-side code, or that imports
`@supabase/supabase-js` outside `src/lib/data/prisma/**`, requires a new ADR before implementation."*
This is that ADR.

**The steward argued against reading B once, before writing this, and was not overruled so much as
answered — the operator picked B from a table that stated B's cost.** The argument is preserved under
Rationale rather than deleted, on the same grounds ADR-002 gave for keeping its own losing paragraph.

**Five questions inside this decision were not answered by it. One was answered the same day.** They
are enumerated under "Open questions", each with the steward's recommendation. **OQ-4 — does a
Supabase project exist — was the blocking one, and the operator answered it: it exists, they created
it.** The remaining four are shaped by OQ-1's answer and none of them blocks a ticket from starting.

## Context

**What is true today, read rather than recalled, on `origin/main` at `5793d39`, 2026-08-25.**

| Fact | Where |
|---|---|
| `DATA_SOURCE` is a two-value enum, `"mock" \| "prisma"`, resolved once at module load | `src/lib/data/index.ts` |
| Its value is **rendered to the page** under `data-testid="home-data-source"` | `src/app/page.tsx` |
| The Prisma adapter is nine modules, 266 lines, and works | `src/lib/data/prisma/` |
| The mock adapter is nine modules, 666 lines, and is the default | `src/lib/data/mock/` |
| `prisma/schema.prisma` is a DRAFT under RULE-09. No migrations directory has ever been created | `prisma/` |
| `@prisma/client` 7.9.1 and `prisma` 7.9.1 are in the tree | `package.json` |
| **ADR-006 is implemented.** `SYS-01` is `DONE`, merged as PR #32 and #33. `better-auth` is gone, `@supabase/ssr` 0.12.5 is in, `src/app/api/auth/` is deleted, and `src/lib/auth/` now holds `permissions.ts`, `supabase.ts` and `self-signup.ts` | `package.json`, `src/lib/auth/` |

**The row above was written the other way round first, and the correction is left visible rather than
quietly fixed.** The first draft of this table said *"Better Auth is still installed and wired"* and
*"no `@supabase/*` package is [in the tree]"*. Both were read from real files — of a local `main`
eight commits behind `origin/main`, where SYS-01 had already merged. Every fact was verified and every
fact was stale. **This is filed as MD-39**, and it matters to this ADR beyond the embarrassment: it is
the same failure as MD-35(a) — a judgement measured against a base that has moved — and this document
is a judgement about the tree.

**One consequence for the decision itself, and it makes ADR-007 cheaper rather than dearer.** ADR-006
is no longer a pending decision to sequence against; it is merged. The two-package arrangement in
§3 is therefore half-built already: `@supabase/ssr` is in the tree, restricted in
`no-restricted-imports`, exempted for `src/lib/auth/**`, and check D12 passes on it. What this ADR adds
is the second package and the second exemption, against a shape that exists and works.

**The schema already cannot be expressed in Prisma, and this predates the decision.**
`.ai/standards/data-model.md` §"The raw-SQL boundary" states it plainly: INV-04 needs a partial unique
index and INV-05 needs a constraint trigger relating rows in two tables, *"Not expressible in Prisma's
schema language"*. Both live in `prisma/constraints.draft.sql`, outside `schema.prisma`, and the same
section records the consequence — *"`prisma db push` cannot be the mechanism that creates them in any
environment that matters, and a developer who resets their database with `db push` will have a schema
that accepts data the production schema rejects."* The project already carries two schema artefacts
that must agree and that no tool reconciles.

**Nothing has been migrated, and that is why this is cheap now.** Same property ADR-006 relied on:
zero migrations applied, zero rows, an unapproved draft schema. The Prisma adapter is 266 lines of
working code with no production data behind it. After the first migration this decision costs a data
move; today it costs a rewrite of nine small modules.

## Decision

**The Supabase client is the data-access implementation behind `src/lib/data/`. Prisma is removed.
`DATA_SOURCE` defaults to the real database.**

1. **The seam does not move. RULE-02 is untouched.** `src/lib/data/` remains the only path to data and
   the only place authorization is enforced. What changes is which adapter sits behind it:
   `src/lib/data/prisma/**` is replaced by a `supabase/` sibling under `src/lib/data/`, module for module, against the
   same DTOs in `src/lib/data/types.ts`. Callers do not change. Review checks R4 and R6 keep the
   meaning they have today.

2. **`@supabase/supabase-js` is adopted for data. `@prisma/client` and `prisma` leave `package.json`.**
   This strikes ADR-002's clause *"Prisma is the only database client. No Supabase SDK is added."*

3. **Two Supabase packages, two exempted directories, and neither exemption covers the other's
   package.** ADR-006 established `@supabase/ssr` for auth, exempted for `src/lib/auth/**` alone. This
   ADR adds `@supabase/supabase-js` for data, exempted for the new `supabase/` adapter
   directory under `src/lib/data/` alone.
   `src/lib/auth/**` may not import the data client and `src/lib/data/**` may not import the auth
   client — the separation ADR-006 §6 asked for is preserved, not widened.

4. **Every Supabase client, for data as for auth, is constructed server-side only.** No Supabase
   client in a `"use client"` file. No key reaches the browser as a data credential. **This is the
   clause the rest of the decision rests on**, and it is the same answer the operator gave to ADR-006's
   OQ-1 and to ADR-002's framing before it.

5. **Row Level Security stays off, and ADR-002's revert condition does not fire.** ADR-002 turned RLS
   off on one premise — that `src/lib/data/` is the only path in — and named its revert condition as
   *direct client-to-database access*. Clause 4 keeps that premise true. Replacing the server-side
   client is not client-to-database access. **This is a narrow escape and it is stated as one:** RLS
   stays off because of clause 4 and nothing else, and the day clause 4 is broken RLS becomes
   mandatory, not advisable. See Revert condition.

6. **Schema authoring moves to SQL migrations under `supabase/migrations/`.** `prisma/schema.prisma`
   and `prisma/constraints.draft.sql` collapse into one artefact in the language the constraints
   already had to be written in. The draft is not applied by this decision — **RULE-09 still requires a
   human to approve the first migration**, and this ADR does not approve one.

7. **`DATA_SOURCE` becomes `"mock" | "supabase"` and defaults to `"supabase"`.** The mock adapter is
   kept, not deleted — it is what lets unit tests run without a network, and
   `.ai/standards/testing-standards.md` depends on it. The default flips because the operator asked
   for the cutover in words: *"Chuyển mock data sáng db thật."* The fixture data in
   `src/lib/data/fixtures.ts` becomes the seed applied to the real database, so both modes keep
   rendering identically as `.ai/standards/data-model.md` §Seeding requires.

8. **Check D12 is rewritten a second time, and its current "always wrong" branch is now wrong.**
   `scripts/check-docs.mjs` errors on any lint exemption whose literal names both a `lib/data` path and Supabase, with the
   message *"the data seam holding an auth client is the drift that decision exists to
   prevent"*. Under this ADR the new adapter directory is a legitimate exemption. The check must
   distinguish the two packages rather than the two directories: `@supabase/ssr` exempted for
   `src/lib/auth/**`, `@supabase/supabase-js` exempted for the data adapter directory, and any other pairing
   an error. Rewriting it is part of the work this ADR authorises, and **D12 will fail on the
   first commit of that work until it is rewritten — that is D12 working correctly**, exactly as
   ADR-006 recorded for its own turn.

## Rationale

**In favour, stated fairly, including the argument the steward did not have.**

- **One vendor, and now genuinely one.** ADR-006 already put identity on Supabase. Keeping data on a
  second toolchain means two migration stories, two type systems, and two places a developer must
  learn before touching a row.
- **The two-schema-artefact problem disappears, and this is the strongest point.** The project already
  has to write raw SQL for INV-04 and INV-05, already has a documented failure mode where `db push`
  produces a schema that accepts data production rejects, and already carries two files that must
  agree with no tool checking that they do. SQL migrations are one artefact in one language. This
  removes a real, already-documented defect rather than trading one tool for an equivalent one — which
  is precisely what ADR-002 said Supabase Auth would *not* do, and the difference is why the same
  objection does not land the same way here.
- **The cost is at its global minimum and will not be again.** 266 lines, no migration, no rows.

**Against, stated once, before implementing, and preserved because it is a fact about the mechanism
rather than a preference about it.**

- **B removes a guard nobody chose to remove, and it is the compiler.** `@prisma/client` cannot run in
  a browser; an import of it from a `"use client"` file fails at build time. That was never designed as
  an enforcement of RULE-02 — it is an accident of Prisma being a Node library — but it *was* one, and
  it was the only one that could not be edited away. `@supabase/supabase-js` is isomorphic and runs in
  a browser perfectly. After this decision the only things standing between a component and the
  database are `no-restricted-imports` and check D12: two guards in files that the same pull request
  can change. **ADR-002's most dangerous sentence was *"A tempting escape hatch is now one `pnpm add`
  away."* After this ADR it is not one `pnpm add` away. It is already installed.**
- **Type safety becomes environment-dependent.** Prisma generates types from `schema.prisma`, a file in
  the repository, offline, deterministically. Supabase generates them from a live database, which
  means a provisioned project and a network are now inputs to type-checking. Whatever OQ-2 decides,
  the property that `pnpm typecheck` needs nothing but the repository is lost.
- **ADR-002's vendor-coupling clause inverts.** It could truthfully say moving off Supabase was a
  connection-string change *"because the schema is plain Postgres and Prisma is the only client"*.
  PostgREST-shaped queries are not portable to another host. Combined with ADR-006's identity
  coupling, migrating off Supabase is now a rewrite of both the data layer and the auth layer.
- **C's cutover removes the property that let three features ship.** `DATA_SOURCE=mock` is why
  `ROO-01`, `DEV-01` and `MEM-01` could be built, reviewed and QA'd with no database anywhere. Flipping
  the default makes a provisioned Supabase project a prerequisite for `pnpm dev`, for `pnpm verify`,
  and for every future ticket. ADR-006 already recorded losing this for auth; clause 7 loses it for
  everything.

**The alternative rejected: keep Prisma for schema and migrations, use the Supabase client only for
reads and writes.** This is the hybrid that looks cheapest — no schema rewrite, no migration story to
learn — and it is rejected because it makes the two-artefact problem worse rather than better. Two
tools would both believe they own the schema, one generating types from a file and the other from the
database, and the drift between them would surface as a type that compiles against a column that no
longer exists. The whole argument for B is that one artefact in one language replaces two that no tool
reconciles; a hybrid keeps both and adds a third.

## Consequences

**Easier.**

- One vendor, one dashboard, one migration story.
- `schema.prisma` and `constraints.draft.sql` become one file, in the language the constraints
  already required.
- The `db push` divergence documented in `.ai/standards/data-model.md` stops being possible.
- Two dependencies leave the tree; one enters.

**Harder, and these are the prices.**

- **RULE-02 loses its compiler-level backstop**, per Rationale. Nothing replaces it except lint and
  D12, both editable in the same pull request as the breach. This is recorded as model debt with a fix
  shape rather than smoothed over.
- **`data-testid="home-data-source"` renders a value that is changing.** `src/app/page.tsx` prints
  `DATA_SOURCE` verbatim, so any Playwright assertion on the string `prisma` breaks. It is named here
  because it is the kind of coupling that is found by a red test rather than by reading the diff.
  `src/app/(app)/seats/seats-manager.tsx` carries a comment reasoning about `DATA_SOURCE=prisma`
  that goes stale in the same change.
- **A Supabase project must exist before anything runs at all** — not merely before it is tested.
  ADR-006 lost this for auth; clause 7 loses it for the whole application. OQ-4 is blocking for that
  reason.
- **The first migration is a RULE-09 human gate sitting in the middle of the work**, not at its edge.
  Nothing about clause 6 changes that, and this ADR deliberately does not approve a schema.
- **`prisma/seed.ts` has no home.** Clause 7 keeps its data; where the seed runs from, and whether it
  is SQL or TypeScript, is OQ-3.
- **Migrating off Supabase is now a rewrite**, where ADR-002 could honestly call it a configuration
  change.

## Revert condition

Both signals are machine-checkable, and both are extensions of D12 rather than review judgements.

1. **Any `@supabase/*` import appears in a `"use client"` file, or outside the two allowlisted
   directories.** This is clause 4 broken, which is the single premise clause 5 rests on. On
   observation: **Row Level Security is switched on**, because at that moment `src/lib/data/` is no
   longer the only path in and RLS stops being redundant defence. ADR-002's RLS clause is reopened on
   its own terms, exactly as ADR-002 wrote it.
2. **A Supabase anon or service key appears in any file reachable by the client bundle**, including
   `NEXT_PUBLIC_*` environment variables. ADR-002's revert condition names the key as well as the
   import, and the key is the half a lint rule does not see.

A third signal, weaker and therefore advisory rather than automatic: **if OQ-2 resolves in a way that
requires a live database to type-check, and CI cannot be given credentials**, the type layer degrades
to hand-written interfaces that nothing verifies against the schema. That is not a breach of this
decision, but it removes most of its remaining argument, and it should reopen clause 2 rather than be
absorbed.

## Open questions

Five, none answered here. **OQ-4 blocks implementation regardless of the rest.**

### OQ-1 — Does `prisma` survive as a dev-only tool, or leave entirely?

**Recommended: leave entirely.** Keeping it for introspection or type generation reintroduces the
two-owners problem the hybrid alternative was rejected for, at a smaller scale but with the same
failure. If the schema is SQL, the schema is SQL.

### OQ-2 — What generates the TypeScript types for the tables?

**Recommended: `supabase gen types typescript`, output committed to the repository, regenerated as
part of any migration and diffed in review.** Committing the generated file is what keeps
`pnpm typecheck` working offline and in CI without database credentials — it moves the network
requirement from every type-check to every schema change, which is the correct place for it. The
alternative, generating at build time, makes CI depend on a live database and is not recommended.

### OQ-3 — Where does the seed live, and does `src/lib/data/fixtures.ts` stay the source?

**Recommended: fixtures stay the single source, and the seed becomes a script that writes them
through the seam.** `.ai/standards/data-model.md` §Seeding requires mock and real to render
identically; that only stays true if one file feeds both. A hand-written SQL seed is a second copy of
the fixture data and will diverge on the first change.

### OQ-4 — Does a Supabase project exist, and who provisions it? **ANSWERED — no longer blocking.**

**Answered by the operator, 2026-08-25: *"tôi đã tạo supabase project"* — the project exists and the
operator provisioned it.** No recommendation had been offered, because provisioning is an operator
action with a billing relationship attached to it.

This unblocks the work. It also retires a consequence ADR-006 recorded as a loss — *"a Supabase
project must exist before anything can be tested, including locally"* — which was true and outstanding
from 2026-08-24 until now.

**Three things the answer does not settle, and they are preconditions on the implementing ticket
rather than open questions on this decision.** Recorded here so the ticket inherits them instead of
discovering them:

1. **Which credentials exist and where.** `.env.local` is gitignored and is not verifiable from the
   repository by any agent. The ticket's first step is to confirm `DATABASE_URL`, `DIRECT_URL` and the
   Supabase project URL and keys are present on the machine it runs on, and to stop if they are not —
   under clause 7 the application does not start without them, so this fails as a connection error at
   the least useful moment otherwise.
2. **Whether it is one project or one per environment.** One project for local and production means a
   developer's `db push` reaches production data. Nothing in this ADR decides it, and it is a question
   for the operator at the point it costs something.
3. **That `.env.example` still names Prisma's field layout.** `.ai/standards/integrations.md` carries
   a `TODO(verify):` on which reader gets which URL once Prisma is gone. Verify against the Supabase
   CLI's own documentation, not from memory — the two-URL split is a pooler property and survives, but
   the wiring does not.

### OQ-5 — Is INV-05's constraint trigger written with the first migration, or deferred?

**Recommended: written with it.** `.ai/standards/data-model.md` states INV-05 *"needs more than an
index because it relates two rows in different tables"* and that a constraint trigger is the usual
instrument. Deferring it means the first real database accepts data that violates an invariant, and
INV-05 has no application-level enforcement recorded anywhere. Drafting it is a design activity;
applying it is a RULE-09 human one.

## Affected documents

**Nothing in this table is speculative — each row names a specific sentence that this ADR makes
false.** Rows marked ✅ are done in the same change as this ADR; the rest belong to the ticket that
implements it, because writing them before OQ-1 to OQ-3 are answered would mean writing them twice.

| File | Change | doc_version |
|---|---|---|
| `.ai/registry/decisions/ADR-002-supabase-hosted-postgres.md` | The Prisma clause struck; the RLS clause affirmed **conditionally** on clause 4; the vendor-coupling consequence marked inverted | 3 → 4 ✅ done |
| `.ai/standards/integrations.md` | The Supabase feature table's Postgres row; the paragraph *"Prisma is the only database client, and this did not change"* reverses; two packages and two exemptions | 3 → 4 ✅ done |
| `.ai/standards/data-model.md` | §"Provider: Supabase, as hosted Postgres only" retitled and rewritten; §"The raw-SQL boundary" loses the `db push` divergence; §Seeding per OQ-3 | 2 → 3 ✅ done |
| `.ai/standards/rbac-and-security.md` | §"Auth implementation" — the sentence that RLS stays off *because* the data seam holds no Supabase client no longer states the reason correctly | 2 → 3 ✅ done |
| `.ai/board/model-debt.md` | The RULE-02 compiler-backstop loss (MD-33), the unverified affected-documents table (MD-32), the ID collision (MD-34) and its renumbering, the stale-checkout defect (MD-39) | — ✅ done |
| `.ai/board/backlog.md` | Three citations rewritten for the MD-34 renumbering | — ✅ done |
| `.ai/standards/testing-standards.md` | What `DATA_SOURCE=mock` guarantees once it is no longer the default; parity stops being optional in practice | 3 → 4 ✅ done |
| `.ai/standards/architecture.md` | §"The seam" — the bootstrap quotation kept verbatim, annotated; §"Framework notes" stack list | 2 → 3 ✅ done |
| `.ai/registry/glossary.md` | **Seam** — "the Prisma implementation" becomes "the real one" | 2 → 3 ✅ done |
| `.ai/01-operating-model.md` | R4 stops naming a vendor; what R4 now covers, and why it carries more weight | — ✅ done |
| `CLAUDE.md` | §Stack — Prisma and Better Auth out, both Supabase packages in, with a note that `main` does not match yet | — ✅ done |
| `.ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md` | §Context's *"Prisma as the only database client … remain in force"*; §Affected documents reconciled against the files | 3 → 4 ✅ done |
| `.claude/agents/steward.md` | §Research and §"Recall is not evidence" name Prisma 7 and Better Auth as the things to verify | — ✅ done |
| `scripts/check-docs.mjs` | D12 rewritten per clause 8; the revert conditions above made checkable | — |
| `eslint.config.mjs` | `@supabase/supabase-js` restricted, exempted for the data adapter directory alone; Prisma patterns removed | — |
| `prisma/` replaced by `supabase/migrations/` | Clause 6. **RULE-09 — human** | — |
| `.env.example` | Supabase URL and keys; `DATA_SOURCE` default | — |
| `src/lib/data/index.ts`, the new adapter directory, `src/app/page.tsx`, `package.json` | The implementation. Belongs to a ticket, not to this ADR | — |
