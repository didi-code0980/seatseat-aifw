```yaml
---
stage: IDEA
agent: product
produced_at: 2026-08-25T02:55:26Z
inputs_read:
  - .ai/templates/idea.md
  - .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md
  - .ai/registry/decisions/ADR-002-supabase-hosted-postgres.md
  - .ai/registry/decisions/ADR-003-member-identity.md
  - .ai/registry/invariants.md
  - .ai/registry/features.md
  - .ai/registry/rules.md
  - .ai/standards/integrations.md
  - .ai/standards/rbac-and-security.md
  - .ai/board/model-debt.md
  - .ai/board/backlog.md
consulted: []
gate: PASS
blocking_reason: ""
next_state: TRIAGE
---
```

## Problem

**Nobody can sign in, and nobody can say what "on Supabase" is supposed to mean when they can.**

Two distinct problems arrived in one sentence. They are in very different states and the difference
is the whole content of this idea.

**Problem one — the identity surface is empty and the product question that emptied it is unanswered.**
Better Auth was removed by decision on 2026-08-24 (ADR-006, `ACCEPTED`). Its replacement is specified
but not built: `SYS-01` in `.ai/registry/features.md` is `IN_PROGRESS` with SPEC and DESIGN passed on
`feat/SYS-01` and *no implementation yet*. The user-facing half — signing in and signing out — is not
on the board at all: the backlog records it as **withdrawn by the operator on 2026-08-24 to be
discussed with product**, and its registry row was deleted with it (commit `1148108`). So today an
Admin, a Manager and a User all face `src/app/(auth)/login/page.tsx`, which ADR-006 describes as *"a
static form. No handler is wired to it."* The live problem is not *which provider* — that is decided
— it is that the product question which stopped the sign-in work has no answer, and until it has one
the feature cannot be re-issued. **This idea is that product discussion.** The question, recorded in
`.ai/board/backlog.md` as the BA's Q-1: *does signing in resolve a `Member` for the signed-in
identity, and if so by what key?*

**Problem two — the words "database fully on Supabase" do not describe a change anyone can act on.**
Postgres is *already* Supabase, and has been since ADR-002 on 2026-08-11. The request therefore either
restates something already true or asks for something further, and the two candidates for "something
further" have wildly different costs — one is a configuration and migration exercise, the other
strikes an accepted ADR clause and puts pressure on RULE-02. Nothing in the request distinguishes
them, and an agent that guesses will guess in a direction nobody chose. It is written down here as an
ambiguity rather than resolved, because resolving it by assumption is the failure this stage exists to
prevent.

**What was proposed, recorded as context and not as the framing.** The operator's words, verbatim:
*"Tôi muốn thay đổi cơ chết Auth hiện tại và database đang dùng sang dùng hẳn trên supabase"* —
change the current Auth mechanism and the database in use over to running fully on Supabase. That is a
solution shape. Half of it is already an accepted decision; the other half is not yet a statement of
what would change.

## Who has it

| Who | How often | What they cannot do |
|---|---|---|
| Admin, Manager, User — every person who would use the system | Every attempt, since the product exists | Sign in. There is no wired handler on the login page, and the sign-in feature is off the board. |
| Manager or Admin creating an account | Every account creation, for as long as INV-08 stands | Create an account through any built path — the `AUT` group table in `.ai/registry/features.md` is empty, and INV-08's "created by Manager or Admin only" has no surface that does it. |
| The operator, at each dispatch decision | Every time this request is picked up | Say whether "database fully on Supabase" means a migration cutover, a data-client replacement, or nothing new. Three agents would read it three ways. |
| Every ticket shipped so far | Already happened, three times | `ROO-01`'s registry row records *"Auth guard deferred to AUT"*. `DEV-01` and `MEM-01` are `DONE` and merged with no rank gate reachable at runtime, because there is no session to gate on. |

## Evidence

This is observed state, not a projection. Each item was read in a file today.

- `.ai/registry/features.md` — the `AUT` table is empty; `SYS-01` is `IN_PROGRESS`, *"SPEC and DESIGN
  both passed on `feat/SYS-01` (2026-08-24); no implementation yet."*
- `.ai/board/backlog.md` — *"Sign in and sign out with Supabase Auth was issued, seeded and specified
  in a single day, then **withdrawn by the operator to be discussed with product**."* It records
  `gate: BLOCKED`, `next_state: ESCALATED`, and that the story survives on an unmerged branch at
  commit `fdfe96a` as an archive. Commit `1148108` on `main` removed the registry row.
- `ADR-006` Context — the login page is a static form with no handler; `DATA_SOURCE` defaults to
  `mock`; `prisma/schema.prisma` is a DRAFT under RULE-09; *"no migrations directory has ever been
  created"*; there are no user rows and no sessions.
- `ADR-002` Decision — *"Postgres is hosted on Supabase"* and *"Prisma is the only database client"*,
  both affirmed as still in force by `ADR-002` §Status after ADR-006 partially superseded it. This is
  what makes the second half of the request ambiguous rather than new.
- `.ai/standards/integrations.md` (`doc_version: 3`) and `.ai/standards/rbac-and-security.md`
  (`doc_version: 2`) both already describe Supabase Auth as in use, and `.ai/registry/invariants.md`
  is at `doc_version: 5` carrying the INV-08 enforcement note — the three target versions ADR-006's
  Affected-documents table asks for. **The table itself still says *"Nothing below has been changed
  yet except the two ADR status lines"* and leaves those rows unticked.** The documents and the
  table disagree; see OQ-2.
- `.ai/board/model-debt.md` MD-14 — *"INV-08 has no enforcement."*

## Impact if ignored

- **The product stays unusable by anyone who is not running it locally.** Three CRUD features are
  merged into `main` and none of them is reachable by a signed-in person, because there is no signing
  in. Each further feature adds to a pile that cannot be demonstrated to a real user.
- **The withdrawn sign-in work ages on an unmerged branch.** `fdfe96a` holds ten live acceptance
  criteria and the `ticket.yaml` they were specified against. Every day the surrounding code moves,
  re-seeding from that commit costs more, and at some point re-specifying becomes cheaper than
  restoring — at which point the withdrawal cost a story rather than deferring one.
- **The ambiguity gets resolved by whoever touches it first, silently.** A BA or Tech Lead reading
  "fully on Supabase" as *replace Prisma* would produce a design that strikes an ADR-002 clause and
  fires ADR-002's own revert condition, without an ADR ever being written. That is the exact
  ordering ADR-002 forbids: *"requires a new ADR before implementation, not after."*
- **INV-08 stays a sentence.** MD-14 is open, the invariant is held by a `localStorage` flag, and the
  ticket that would give account creation a real surface does not exist. The longer there is no
  account-creation path, the longer nothing forces the question of what actually guards it.
- **ADR-006's cheapness expires.** The ADR states the switch is at its global minimum cost *"and will
  never be this cheap again"* — zero users, zero sessions, no migration applied. Every one of those
  three facts is true only until the first real cutover.

## Constraints already known

Cited by ID. Each line is what the constraint forbids or forces, not a summary of it.

| ID | How it bounds the solution space |
|---|---|
| **RULE-01** | Changing `.ai/registry/**` requires an ADR and human approval. Re-issuing the withdrawn `AUT` row, or any new feature ID, is a human action — this idea cannot take it and does not name an ID. |
| **RULE-02** | No component may bypass the `src/lib/data/` seam, enforced by ESLint. Reading b in OQ-1 puts a second data client in the tree; whatever it touches must not become a second path to data. |
| **RULE-09** | Schema changes, ADRs, registry edits and merges are permanently human. `prisma/schema.prisma` is still an unapproved DRAFT, so any reading that requires a first migration — or `Member.authUserId` — passes through a human gate in the middle of the loop. |
| **INV-08** | *"There is no self-signup. Accounts are created by Manager or Admin only."* The text is unchanged and is not negotiable here; a change to it escalates under RULE-07 rather than being implemented. What holds it is a different matter — see MD-14. |
| **ADR-002** | Postgres on Supabase, Prisma as the only database client, RLS **off by decision**, two non-interchangeable connection strings. The RLS clause rests entirely on the seam being the only path in, and the ADR's revert condition names its own observable signal: a Supabase client key in client-side code, or a Supabase import outside the allowlisted path. |
| **ADR-003** | `Member` is its own table with a nullable one-to-one link to the identity provider's user; a Member without that link is a person the organization tracks who cannot sign in. Deleting a login must not delete the Member. Any identity-resolution answer must keep this true. |
| **ADR-006** | `ACCEPTED` 2026-08-24. Supabase Auth is the provider; Better Auth is removed; the client is **server-side only**; `@supabase/ssr` is the only package, exempted for `src/lib/auth/**` alone; `Member.authUserId` is a plain `String? @unique` with no foreign key; authorization does not move. Its four open questions are answered. **This idea does not reopen any of it.** |
| **MD-14** | INV-08's enforcement gap is a known, recorded price, not a discovery. Any work that creates an account-creation path inherits it, and ADR-006's OQ-2 records the fix shape that was not adopted. Reading this entry is a precondition for assuming the invariant is enforced. |

## Out of scope

- **The authorization model.** `src/lib/auth/permissions.ts` is provider-independent per ADR-006 §3 —
  it imports `type Role` from the seam and nothing else. `ROLE_RANK`, `can()` and the role helpers do
  not change, `Member.role` stays the source of role, and `src/lib/data/` stays where the check
  happens. Supabase Auth answers *who is this* and is never asked *what may they do*.
- **Creating or restoring any feature ID.** No ID is named in this file, including the withdrawn one.
  Restoring it means a human adds the row to `.ai/registry/features.md` (RULE-01), and that step is
  real and is not performed by triage.
- **Re-litigating ADR-006.** The provider choice, the server-only constraint, the package allowlist
  and the four answered questions are settled. An idea is not an appeal.
- **Re-litigating the `localStorage` decision for INV-08.** It was decided against the steward's
  recommendation and is recorded as MD-14. Naming a constraint is not proposing to change it.
- **Acceptance criteria and any solution design.** Both belong downstream, to a BA writing from a
  registry entry.
- **RLS.** It is off by ADR-002's decision and stays off unless OQ-1 resolves in a direction that
  fires ADR-002's revert condition — in which case that is a new ADR, not a line in this idea.
- **Anything in the tracker.** No ClickUp state is claimed or changed here.

## Open questions

**OQ-1 — the one that must be answered first. What does "database đang dùng sang dùng hẳn trên
supabase" mean? Answer with a single letter.**

Postgres is already on Supabase (ADR-002, 2026-08-11), so the phrase has three readings and they are
not close in cost. Deliberately not chosen here.

| | Reading | What it would cost |
|---|---|---|
| **A** | Nothing new — it restates the already-accepted ADR-002 position. | Zero. The idea reduces to its auth half. |
| **B** | Replace Prisma with the Supabase client / PostgREST as the data-access path. | Strikes ADR-002's *"Prisma is the only database client"* clause, puts direct pressure on RULE-02's seam, and — if any of it reaches the browser — fires ADR-002's revert condition, which makes Row Level Security mandatory. Requires a new ADR **before** implementation. This is a NEEDS-ADR path. |
| **C** | Stop running on mock fixtures and actually run against the hosted Supabase Postgres. | `DATA_SOURCE` defaults to `mock`, `prisma/schema.prisma` is an unapproved DRAFT, and ADR-006 records that *"a Supabase project must exist before anything can be tested."* No ADR needed; a human schema approval under RULE-09 is. |

**A, B, or C.** One letter settles it.

**OQ-2 — is ADR-006's Affected-documents table stale, and is check D9 still failing?** The table says
nothing below it has changed, yet `integrations.md` is at `doc_version: 3`, `rbac-and-security.md` at
`2`, and `invariants.md` at `5` — the three target versions the table asks for, with content that
matches. Either the table needs its rows ticked, or something in those documents is not what the
table intended. This could not be settled from the files alone and no check was run (no `Bash` tool).

**OQ-3 — the withdrawn product question, restated because it is the reason the feature is off the
board.** *Does signing in resolve a `Member` for the signed-in identity, and if so by what key?*
`.ai/board/backlog.md` enumerates three branches and states that the story recommended one and
deliberately did not adopt it: (i) resolve nothing and admit on session presence alone; (ii) resolve
by email as a declared temporary convention — the only branch testable today; (iii) add
`Member.authUserId` here, which is the right end state, is untestable until a Supabase project
exists, and puts a RULE-09 human gate mid-loop. This is a product decision about what the application
promises, not a technical one: branch (i) admits every authenticated request into a system that
enforces no rank anywhere, while INV-08 is held by a flag that enforces nothing (MD-14).

**OQ-4 — does a Supabase project exist yet, and who provisions it?** ADR-006 states one must exist
before anything can be tested, including locally, and that this property was lost when Better Auth
went. Nothing in `.ai/board/` or `.ai/registry/` records whether the project, its keys, or
`.env.local` exist on any machine. Readings B and C of OQ-1 are both blocked on it; the auth half is
blocked on it for anything past unit tests.

**OQ-5 — does the sign-in surface come back as one feature or two?** The withdrawn row was titled
*"Sign in and sign out with Supabase Auth"*, and `SYS-01` already covers the provider swap underneath
it. Whether the user-facing sign-in is one restored `AUT` row, or splits from account creation
(*"Account management UI"*, also waiting on an `AUT` row), is a human's call when the registry rows
are written. Naming it here so triage does not assume one shape.
