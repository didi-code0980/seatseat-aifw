---
doc_version: 4
last_updated: 2026-08-25
governed_by: [RULE-01, RULE-09]
---

# ADR-006 — Supabase Auth replaces Better Auth

## Status

`ACCEPTED` — 2026-08-24, by the operator.

The operator's instruction, verbatim: *"Thay đổi tôi muốn đập bỏ phần Auth hiện có thay hoàn toàn
bằng Auth trên supabase."* — tear out the existing auth and replace it entirely with Supabase Auth.

Recorded by the steward under the authority ADR-004 established, and under the standing instruction
that the steward may write `decisions/` **to record a decision the operator made, in words, that can
be pointed at**. The words are quoted above. The steward argued against this decision once, on the
grounds set out under Rationale, and was overruled; the argument is preserved there rather than
deleted, because an ADR that records only the winning side is not a record.

**Four questions inside this decision were not answered by it, and were answered later the same
day.** They are recorded below under "The four questions". Three took the steward's recommendation;
one did not, and the divergence is stated there rather than smoothed over.

## Context

**What ADR-002 decided, and is now reversed.** On 2026-08-11 the operator accepted ADR-002, which
chose Supabase as hosted Postgres and stated: *"Authentication stays on Better Auth, unchanged.
Supabase Auth is not adopted."* That clause is what this ADR reverses. ADR-002's other clauses —
Postgres on Supabase, Prisma as the only database client, the two-connection-string split — are
untouched and remain in force.

> **The Prisma half of that sentence stopped being true on 2026-08-25.** ADR-007 strikes ADR-002's
> *"Prisma is the only database client"* clause and replaces the adapter behind `src/lib/data/` with
> `@supabase/supabase-js`. Postgres on Supabase and the two-connection-string split are still
> untouched. Nothing else in this ADR changes: see the note at the end of §Affected documents on why
> ADR-007 does **not** widen this ADR's single lint exemption.

**What exists today, verified by reading rather than recalled.** The Better Auth surface is six
files and one test:

| File | What it holds |
|---|---|
| `src/lib/auth/auth.ts` | The `betterAuth()` server instance. `disableSignUp: true`, `nextCookies()` plugin |
| `src/lib/auth/client.ts` | `createAuthClient` from `better-auth/react`; exports `signIn`, `signOut`, `useSession` |
| `src/app/api/auth/[...all]/route.ts` | `toNextJsHandler(auth)`, GET and POST only |
| `src/app/(auth)/login/page.tsx` | A static form. No handler is wired to it |
| `src/components/shared/PermissionGate.tsx` | Renders by role |
| `package.json` | `better-auth: 1.6.26` |
| `tests/unit/permissions.test.ts` | Tests `can()` and the role helpers |

**`src/lib/auth/permissions.ts` is not in that list, and that is the most important fact in this
document.** It imports exactly one thing — `import type { Role } from "@/lib/data"` — and contains
`ROLE_RANK`, `ROLES`, `can()`, `canCreateAccount()`, `canManageRooms()`, `canApproveRequests()`.
**It has no dependency on Better Auth whatsoever.** The authorization model that ADR-002 spent a
paragraph defending is not Better Auth code and does not move when Better Auth is removed.

**Nothing has been migrated.** `prisma/schema.prisma` is a DRAFT under RULE-09, no migrations
directory has ever been created, `DATA_SOURCE` defaults to `mock`, and `src/lib/auth/auth.ts` records in a `TODO(verify)` that the
Better Auth Prisma adapter was never wired. There are no user rows, no sessions, and no password
hashes anywhere.

**That last paragraph is why this decision is cheap today and will never be this cheap again.** The
switch costs five files and one dependency. After the first migration and the first real user it
costs a credential migration, which is a class of work with no safe rollback.

## Decision

**Supabase Auth is the authentication provider. Better Auth is removed entirely.**

1. `better-auth` leaves `package.json`. `src/lib/auth/auth.ts`, `src/lib/auth/client.ts` and
   `src/app/api/auth/[...all]/` are deleted. Better Auth's four tables — `user`, `session`,
   `account`, `verification` — never enter `prisma/schema.prisma`.
2. **The identity of record is Supabase's `auth.users`.** ADR-003's substance is unchanged: `Member`
   remains its own table carrying a nullable one-to-one link to the identity provider's user. Only
   the referent changes, from Better Auth's `user` to `auth.users`. A Member without that link is
   still a person the organization tracks who cannot sign in.
3. **Authentication moves; authorization does not.** `src/lib/auth/permissions.ts` is unchanged.
   `Member.role` stays the source of role, `can()` stays the only comparison, and `src/lib/data/`
   stays the place the check happens. Supabase Auth answers *who is this*; it is not asked *what may
   they do*. This is the narrow reading of the instruction, and it is narrow deliberately — the
   broad reading would also replace the permission model, which the operator did not ask for and
   which no Better Auth code implements anyway.
4. **The Supabase client is constructed server-side only.** `@supabase/ssr`, used from server
   components, route handlers and server actions. No Supabase client is constructed in a
   `"use client"` file, and no key reaches the browser as a data credential. `src/lib/data/` remains
   the only path to data, so ADR-002's Row Level Security clause stays true rather than reopened,
   and review checks R4 and R6 keep the meaning they have today.
5. **`Member.authUserId` is a plain `String? @unique` column** holding the Supabase user UUID, with
   no Prisma relation and no foreign key. `auth.users` lives in the `auth` Postgres schema and is
   not modelled here.
6. **`@supabase/ssr` is the only Supabase package.** It is named in `no-restricted-imports` and
   restricted everywhere, with exactly one exemption: `src/lib/auth/**`. `@supabase/supabase-js` is
   not adopted, and `src/lib/data/` is not exempted — the data seam has no reason to hold an auth
   client.
7. **Self-signup is disabled by a client-side configuration flag held in `localStorage`.** This is
   the operator's decision, taken against the steward's recommendation. What it does and does not
   enforce is stated in full under Consequences and under OQ-2 below; it is recorded here as the
   decision because it is the decision.
8. **The `Account` name collision that was about to be decided disappears.** Better Auth's
   `account` table is what collided with the domain `model Account`. With Better Auth gone there is
   no second `account`, and the question of renaming it is void. The domain `Account` model stays as
   it is until an `AUT` ticket has a reason to change it.

## Rationale

**Why this, in the operator's favour, stated fairly.** One vendor for database and identity is one
account, one dashboard, one billing relationship and one support surface instead of two. Password
reset, email verification and OAuth providers arrive as configuration rather than as tickets — Better
Auth would need each of them built and tested. And the migration cost is at its global minimum: zero
users, zero sessions, no migration applied.

**The steward's argument against, recorded because it was made before the decision and does not
expire.** ADR-002 considered this exact option and rejected it in a paragraph headed *"Why not
Supabase Auth, the obvious alternative"*, on the grounds that *"it would replace working code with
equivalent working code"* and that the cost is *"a rewrite of the auth layer to reach the position we
already occupy."* Two further objections, both narrower and both still live:

- **INV-08 moves out of the repository.** Better Auth held "no self-signup" with two controls in
  code — `disableSignUp: true` and the absence of a route — either of which a reviewer can read and
  a test can assert. Supabase disables signup with a **dashboard toggle**, which is configuration no
  CI run can see, no review check can cite, and no `git log` records. An invariant currently held by
  code becomes an invariant held by a checkbox somebody can uncheck. This is a real loss and OQ-2
  exists to decide what replaces it.
- **The seam's monopoly is at risk, though not necessarily lost.** ADR-002 turned Row Level Security
  off *by decision*, and the entire argument rested on `src/lib/data/` being the only path to data.
  A Supabase client in the browser makes that false, which is precisely the revert condition ADR-002
  wrote for itself. It does not have to be false — see OQ-1 — but it becomes false by default if
  nobody decides otherwise.

**The alternative that was rejected**, beyond keeping Better Auth: adopting Supabase Auth *alongside*
Better Auth during a transition. Rejected because there are no users to transition. A dual-provider
window costs the complexity of reconciling two session models to protect data that does not exist.

## Consequences

**Easier.**

- One vendor, one dashboard, one set of credentials.
- Email verification, password reset and OAuth become configuration, not tickets.
- Five files and one dependency leave the repository. `tests/unit/permissions.test.ts` keeps passing
  untouched, because what it tests never depended on the provider.
- The `Account` naming collision is void before it ever cost anything.

**Harder, and these are the real prices.**

- **INV-08 has no enforcement.** This is the sharpest consequence in the document and it is stated
  plainly because an ADR that softened it would be useless later. `localStorage` is browser storage,
  owned by the client and writable by anyone who opens developer tools. A flag held there can be
  changed by the person it is meant to restrain, in one line, with no trace on the server. It is
  therefore **weaker than the dashboard toggle it replaces**, not stronger: the toggle at least sits
  on the provider's side of the network. Under this decision INV-08 is held by nothing that survives
  an adversary, and the invariant text — *"there is no self-signup; accounts are created by Manager
  or Admin only"* — is a statement of intent rather than an enforced rule. Recorded as MD-14 with a
  fix shape, so that the day it matters, the gap is a known price and not a discovery.
- **`auth.users` lives in the `auth` Postgres schema, not `public`.** Prisma reaching across
  Postgres schemas needs `multiSchema`. `TODO(verify):` whether `multiSchema` is generally available
  or still a preview feature in the installed Prisma 7.9.1 could not be established from
  `node_modules/`, and must be confirmed against current documentation before OQ-3 is implemented.
- **Check D12 will fail on the first commit of this work**, by design. `scripts/check-docs.mjs`
  watches for any `@supabase/*` package entering `package.json` because ADR-002's revert condition
  named that as its observable signal. **That is D12 working correctly.** ADR-002 asked for a new ADR
  before the SDK enters the tree; this is that ADR. D12's message still cites ADR-002 alone and must
  be taught about ADR-006 — a `scripts/` change, and it depends on OQ-1.
- **A Supabase project must exist before anything can be tested**, including locally. Better Auth ran
  with no database at all, which is what let the login route render during Phases B and C. That
  property is lost.
- **Vendor coupling stops being limited.** ADR-002 could truthfully say moving off Supabase was a
  connection-string change, because Prisma was the only client and the schema was plain Postgres.
  Identity is not portable that way: `auth.users` rows, password hashes and provider links are
  Supabase's, and moving off means a credential migration.

## Revert condition

**Required, and both signals here are machine-checkable rather than judgement calls.**

1. **A row appears in `auth.users` whose creation cannot be attributed to a Manager-or-above action.**
   That is INV-08 violated in production data, and it means whatever OQ-2 chose did not hold. On
   observation: signup is disabled at the provider immediately, and the account-creation path is
   re-gated before any further AUT work proceeds.
2. **An `@supabase/*` import appears anywhere outside the allowlisted auth module** — that is, in a
   component, a page, or any file that also reads data. This is the ADR-002 failure mode arriving by
   a different door: the browser talking to the database directly while RLS is off. On observation,
   ADR-002's RLS clause is reopened and RLS goes on, because at that point the seam is no longer the
   only path in and RLS stops being redundant.

Both are enforceable by an extension of check D12 rather than by review, and that extension is part
of the work this ADR authorises.

## The four questions, and how they were answered

Answered by the operator on 2026-08-24. Each is recorded with the steward's recommendation beside the
answer, so a later reader can tell which were agreements and which were overrides.

### OQ-1 — Does the Supabase client run in the browser, or server-side only?

**Recommended: server-only. Answered: server-only.** Agreed.

This was the blocking question, and it decides that RULE-02 survives. The browser holds a session
cookie and nothing else; every Supabase call is made from the server. Row Level Security stays off
exactly as ADR-002 decided, because the premise ADR-002 rested on — that `src/lib/data/` is the only
path to data — remains true. Had this been answered "browser client", ADR-002's revert condition
would have fired and RLS would be mandatory.

### OQ-2 — What holds INV-08 once `disableSignUp` is gone?

**Recommended: three controls — provider setting, Admin-API-only creation gated by
`canCreateAccount()`, and an audit check that fails on any client-side signup call.
Answered: a configuration flag in `localStorage`. Overridden.**

**The steward stated its objection once, before implementing, and the objection is preserved here
because it is a fact about the mechanism rather than a preference about it.** `localStorage` is
per-origin browser storage. It is readable and writable by any script on the page and by anyone with
developer tools open. A value stored there is client state, and client state cannot enforce a rule
about what the server will accept: the check happens on the machine of the person being checked.

What this means concretely, and it is not a hypothetical: `localStorage.setItem(<flag>, ...)` typed
into a browser console re-enables whatever the flag gates, with no server-side record that it
happened. That is the whole attack, and it needs no tooling.

The instruction was given, the objection was made once, and the decision is the operator's. It is
implemented as stated and recorded as stated. **MD-14** carries the gap and the fix shape, and the
nearest mechanism that would actually hold — the third control from the recommendation, an audit
check that fails if any client-side signup call exists in `src/` — is written out there so that
adopting it later is a decision rather than a redesign.

### OQ-3 — How does `Member.authUserId` reference `auth.users`?

**Recommended: `String? @unique`, no relation, no foreign key. Answered: the same.** Agreed.

ADR-003's substance is preserved exactly. A deleted `auth.users` row leaves a dangling id, which is
the intended end state spelled differently — ADR-003 already requires that deleting a login must not
delete the Member. The `multiSchema` question raised under Consequences becomes moot: nothing crosses
schemas.

### OQ-4 — Which package, and what does the lint allowlist say?

**Recommended: `@supabase/ssr` only, exempted for exactly `src/lib/auth/**`. Answered: the same.**
Agreed.

`eslint.config.mjs` now restricts `@supabase/*` alongside the Prisma patterns and exempts one path.
Check D12 was rewritten in the same change: it previously failed on *any* Supabase string anywhere,
which was correct under ADR-002 and would have made this decision unimplementable. It now enforces
the narrower shape — `@supabase/ssr` and nothing else, restricted in lint, exempted for one path, and
never imported from `src/` outside `src/lib/auth/`.
## Affected documents

**Reconciled against the files on 2026-08-25.** The paragraph that stood here said *"Nothing below has
been changed yet except the two ADR status lines"*, and it had been false for a day: the three
document rows were worked the same afternoon this ADR was accepted, and the table was never ticked.
The idea `.ai/board/ideas/2026-08-25-supabase-consolidation-scope-unsettled.md` raised the discrepancy
as its OQ-2 — the documents were at the exact target versions the table asked for while the table
claimed none of them had moved. **The documents were right and the table was stale.** It is corrected
below rather than rewritten, and the false sentence is quoted rather than deleted, because a table
that silently agrees with the present is not a record of what was planned.

Check D9 passed throughout, which is worth stating plainly: **D9 verifies that a document's
`doc_version` is at least as high as the rules it cites. It has no opinion about this table.** Nothing
in the audit was ever going to catch an affected-documents list that lies, and that is the general
form of the defect — recorded as MD-32.

| File | Change | doc_version |
|---|---|---|
| `.ai/registry/decisions/ADR-002-supabase-hosted-postgres.md` | Status marked partially superseded; the auth clause struck, the Postgres and Prisma clauses affirmed | 2 → 3 ✅ done |
| `.ai/registry/decisions/ADR-003-member-identity.md` | Status note: substance stands, referent moves to `auth.users` | 2 → 3 ✅ done |
| `.ai/standards/rbac-and-security.md` | §"Auth implementation" rewritten; §"No self-signup" gains whatever OQ-2 decides | 1 → 2 ✅ done 2026-08-24 |
| `.ai/standards/integrations.md` | The Supabase feature table's "Supabase Auth — **Out of scope**" row reverses; §"Two connection strings" unchanged | 2 → 3 ✅ done 2026-08-24 |
| `.ai/registry/invariants.md` | INV-08's enforcement note only — **the invariant text itself does not change** | 4 → 5 ✅ done 2026-08-24 |
| `eslint.config.mjs` | `no-restricted-imports` exemption per OQ-4 | — ✅ done 2026-08-24 |
| `scripts/check-docs.mjs` | D12 taught about ADR-006 and extended to the revert conditions above | — ⚠️ **half done** |
| `prisma/schema.prisma` | `Member.authUserId` per OQ-3; no Better Auth tables. **RULE-09 — human** | — ⏸ **deferred by decision** |
| `src/lib/auth/`, `src/app/api/auth/`, `src/app/(auth)/login/page.tsx`, `package.json` | The implementation itself. Belongs to a ticket, not to this ADR | — ✅ done — `SYS-01`, merged PR #32/#33 |

**The three rows that are not ✅, each with why, because a status word on its own is the thing that
went stale last time.**

- **`scripts/check-docs.mjs` — half done.** D12 *was* rewritten for this ADR: it permits
  `@supabase/ssr` and only it, requires the lint restriction to be present rather than absent, and
  fails on any Supabase import under `src/` outside `src/lib/auth/`. What was not done is the second
  half of the row — *"extended to the revert conditions above"*. Revert condition 1 is a row in
  `auth.users` that no check can see from the repository, so it was never mechanisable here; revert
  condition 2 is the import, and that half is covered. **Neither D12 nor anything else looks for a
  Supabase key in a `NEXT_PUBLIC_*` variable or for a client constructed in a `"use client"` file** —
  the key is the half a lint rule does not see. ADR-007 §Revert condition names the same gap and
  authorises the extension, so the work now belongs to that ADR's ticket rather than to this one.
- **`prisma/schema.prisma` — deferred by decision, not forgotten.** `SYS-01`'s row in
  `.ai/registry/features.md` states it: *"`schema_delta` is expected to stay `none` — `Member.authUserId`
  is not needed while `DATA_SOURCE=mock`, and pulling it in would put a RULE-09 human gate in the
  middle of the loop."* **ADR-007 changes the premise this rests on.** `DATA_SOURCE` will no longer
  default to `mock`, so the reason to defer expires with the cutover, and the column arrives with the
  first migration under ADR-007 §6 rather than as a Prisma schema edit. OQ-3's answer — a plain
  `String? @unique` with no foreign key — is unaffected by the change of tool.
- **The implementation — done, and this row was written "not started" a few hours before it was
  checked properly.** `SYS-01` is `DONE`, merged as PR #32 and #33 on 2026-08-25. `better-auth` is out
  of `package.json`, `@supabase/ssr` 0.12.5 is in, `src/app/api/auth/` and both Better Auth modules are
  deleted, and `src/lib/auth/` now holds `permissions.ts`, `supabase.ts` and `self-signup.ts` — the
  last being clause 7's `localStorage` flag, whose limits are MD-14 and are unchanged by it existing.
  **The first version of this bullet said the opposite**, read from a local `main` eight commits behind
  `origin/main`; it is corrected in place rather than deleted because MD-39 is about exactly that, and
  a table that only ever agreed with the present is what MD-32 is about. **What is still off the board
  is the user-facing sign-in** — withdrawn on 2026-08-24 and its registry row removed in commit
  `1148108`, pending the product discussion that
  `.ai/board/ideas/2026-08-25-supabase-consolidation-scope-unsettled.md` is. `SYS-01` swapped the
  provider underneath; nobody can yet sign in through a page.

**One thing ADR-007 does not change about this ADR, stated because it would be easy to assume
otherwise.** ADR-007 adds a second Supabase package and a second exempted directory. It does **not**
widen this ADR's exemption: `src/lib/auth/**` may name `@supabase/ssr` and nothing else, and the data
adapter may name `@supabase/supabase-js` and nothing else. §6's sentence — *"`src/lib/data/` is not
exempted; the data seam has no reason to hold an auth client"* — remains exactly true.
