---
ticket: SYS-01
stage: SPEC
agent: ba
produced_at: 2026-08-24T07:12:03Z
inputs_read: [ .ai/board/tickets/SYS-01/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/rules.md, .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md, .ai/standards/rbac-and-security.md, .ai/standards/integrations.md, .ai/board/model-debt.md, .ai/board/tickets/DEV-01/01-story.md, .ai/board/tickets/SEA-01/01-story.md, package.json, eslint.config.mjs, scripts/check-docs.mjs ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: READY
---

# SYS-01 — Replace Better Auth with Supabase Auth

Every acceptance criterion below derives from `.ai/registry/features.md`,
`.ai/registry/invariants.md`, `ADR-006`, and `ticket.yaml`. `rbac-and-security.md` and
`integrations.md` supplied the standards statements the criteria are written against; `model-debt.md`
supplied MD-14, which is why AC-10 and AC-11 are shaped as they are. No acceptance criterion
originates in a tracker description (RULE-17) or in `src/**` (RULE-05, never read).

**Three repository files were read and none of them is `src/**`.** `package.json`,
`eslint.config.mjs` and `scripts/check-docs.mjs` were read to establish the *current* state of the
three surfaces this ticket's criteria assert about, because ADR-006's own "Affected documents" table
is out of date on two of them and a story written from the stale table would have specified work that
is already done. What was found is recorded under Open questions as `H-1`. This is not the `src/**`
channel RULE-05 closes: none of the three is application code, and no selector, field name or
implementation detail reached this story from them.

`next_state` reads `READY` because that is the state this story is written toward. **This story does
not put the ticket there.** DoR is the orchestrator's evaluation and the ticket is left at `SPEC`.

## What "observable" means for a ticket with no screen

Every previous ticket in this system delivered a surface a person opens, and its criteria were
written about what renders. This one replaces an authentication provider. It adds no screen, changes
no domain data, and its most important effects are **absences** — a package that is gone, an import
that does not appear, a route that does not exist.

The story template requires that *an AC that cannot be observed from outside the system is not an
AC*. For this ticket, "outside the system" is read as **outside the implementation** — the surfaces a
QA agent can inspect without reading `src/**`:

| Surface | How it is observed | Why it is legitimate |
|---|---|---|
| The dependency tree | `package.json`, the lockfile, the installed tree | Not `src/**`. ADR-002's revert condition names the dependency tree as its own observable signal. |
| The lint configuration | `eslint.config.mjs`, and `pnpm lint`'s exit code | Not `src/**`. RULE-02's enforcement is lint by design, so lint's verdict is the system's answer. |
| The audit | `node scripts/check-docs.mjs`, D12 in particular | D12 exists precisely to make ADR-002's and ADR-006's revert conditions machine-checkable. |
| File existence | Does a path exist or not | Existence is not content. Nothing here requires reading a file under `src/`. |
| The running application | The login route in a browser | The ordinary channel, unchanged. |
| The existing unit suite | `tests/unit/permissions.test.ts` passing **unedited** | A test that must not change is observed by its own result plus `git diff`. |

**Absence criteria carry a trap and it is named here so QA does not fall into it.** A criterion of the
form *no file imports X* is satisfied trivially by a repository where the feature was never built. Two
things stop that reading: AC-3 and AC-6 assert what must be **present**, and AC-8 requires the
application to still build and its existing tests to still pass. An empty repository fails all three.

## Feature

Transcribed from the `SYS — System` table of `.ai/registry/features.md` without paraphrase:

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| SYS-01 | Replace Better Auth with Supabase Auth | SYS | PLANNED | INV-08 | Implements ADR-006. Removes the `better-auth` dependency, the server instance, the browser client and the catch-all route handler; adopts `@supabase/ssr` constructed **server-side only**, exempted in `no-restricted-imports` for `src/lib/auth/**` alone. `src/lib/auth/permissions.ts` is unchanged — it never depended on Better Auth. **`schema_delta` is expected to stay `none`**: `Member.authUserId` is not needed while `DATA_SOURCE=mock`, and pulling it in would put a RULE-09 human gate in the middle of the loop. If DESIGN concludes otherwise, that is a finding to raise, not a decision to take. INV-08 is on this row because self-signup moves from `disableSignUp: true` to the client-side flag ADR-006 records — **read MD-14 before assuming that flag enforces anything.** |

The row is transcribed as it stands and this story does not widen it. Its four instructions are
carried out here rather than reinterpreted: the removals are AC-1 and AC-2, the server-side-only
adoption is AC-3 to AC-6, the `permissions.ts` guarantee is AC-7, and `schema_delta: none` is
out-of-scope item 1 and item 3.

## User value

**No role gains a capability from this ticket, and stating otherwise would be false.** A User, a
Manager and an Admin can do exactly the same things after this change as before it — which is
nothing, on this surface, because the `AUT — Authentication & Accounts` table in
`.ai/registry/features.md` is empty and no sign-in has ever worked. The login page is a static form
with no handler wired to it, and it still will be when this ticket is done.

The value is to the organization and it is **an option bought at its minimum price**. ADR-006 records
the fact that makes this ticket worth running now rather than later: there are no users, no sessions
and no password hashes anywhere, because `prisma/schema.prisma` is a DRAFT, no migration has been
applied, and `DATA_SOURCE` defaults to `mock`. Under those conditions swapping the identity provider
costs five files and one dependency. After the first migration and the first real account it costs a
credential migration, which is a class of work with no safe rollback. Every day this is not done, the
price goes up and never comes back down.

What the organization gets for it: one vendor for database and identity instead of two, and password
reset, email verification and OAuth arriving later as provider configuration rather than as tickets.
What it pays is recorded honestly under *Invariants touched* — INV-08 comes out of this ticket held
by less than it was held by before.

## Acceptance criteria

**This ticket runs against `DATA_SOURCE=mock` and enforces no role guard**, for the same reason
`ROO-01`, `DEV-01` and `SEA-01` did: the `AUT` table is empty, so there is no session and no role to
read. No criterion below has a role in its Given. See the Permissions section and out-of-scope
item 2.

"The login route" means the route the application already serves the login form on. DESIGN names it;
this story does not, because naming it would require reading `src/**`.

**AC-1 — Better Auth is absent from the dependency tree and from the source**
- Given the repository with this ticket's change applied
- When `package.json` is read
- Then no entry named `better-auth` appears in `dependencies`, `devDependencies` or
  `peerDependencies`
- And the lockfile records no `better-auth` package
- And no file under `src/` imports `better-auth` or any `better-auth/*` module
- And no file under `tests/` imports `better-auth` or any `better-auth/*` module

**AC-2 — The Better Auth surface files no longer exist**
- Given the three files ADR-006 names as the Better Auth implementation
- When the repository tree is listed
- Then `src/lib/auth/auth.ts` does not exist
- And `src/lib/auth/client.ts` does not exist
- And no route handler exists anywhere under `src/app/api/auth/`
- And `src/lib/auth/permissions.ts` **does** exist

The last clause is not padding. AC-1 and AC-2 are satisfiable by deleting the whole auth directory,
and `permissions.ts` living in that directory is exactly the file a bulk deletion takes with it. It is
asserted present here and asserted unchanged in AC-7.

**AC-3 — `@supabase/ssr` is present and is the only Supabase package**
- Given the repository with this ticket's change applied
- When `package.json` is read
- Then `@supabase/ssr` appears as a dependency
- And no other package whose name begins `@supabase/` appears in `dependencies`,
  `devDependencies` or `peerDependencies`
- And in particular `@supabase/supabase-js` is absent

`@supabase/supabase-js` is named explicitly because it is the browser client, and it is the specific
package ADR-002's revert condition was written about.

**AC-4 — No Supabase client reaches the browser, and the data seam holds none**
- Given the repository with this ticket's change applied
- When every file under `src/` outside `src/lib/auth/` is inspected
- Then none of them imports any `@supabase/*` module
- And no file under `src/lib/data/` imports any `@supabase/*` module
- And no file carrying the `"use client"` directive imports any `@supabase/*` module, including
  files under `src/lib/auth/`
- And no Supabase key, URL or token is emitted to the browser as a data credential

The third clause is the one that does real work. `src/lib/auth/**` is exempt from the lint rule, so a
`"use client"` file placed inside that directory would import Supabase legally and put the client in
the browser anyway. That is ADR-006's second revert condition arriving through the one door left
open, and no automated check currently closes it — see out-of-scope item 10.

**AC-5 — The restriction is declared in lint, and the data seam is not exempted from it**
- Given `eslint.config.mjs` with this ticket's change applied
- When its `no-restricted-imports` configuration is read
- Then `@supabase/*` is named as a restricted import group
- And exactly one path is exempted from that restriction, and that path is `src/lib/auth/**`
- And no exemption names any path under `src/lib/data/`
- And `pnpm lint` exits 0

**AC-6 — The documentation audit passes, with no D12 finding**
- Given the repository with this ticket's change applied
- When `node scripts/check-docs.mjs` runs
- Then it exits 0
- And it reports no finding against check D12

D12 is cited by ID rather than described, because it is the executable form of ADR-002's and
ADR-006's revert conditions and its own source is the specification of what it checks. AC-3, AC-4 and
AC-5 restate the three branches D12 walks; this criterion asserts the check itself agrees, so that a
change which satisfies the three by inspection and fails the audit is caught as the contradiction it
is.

**AC-7 — Authorization is untouched by the provider change**
- Given `src/lib/auth/permissions.ts` as it stands before this change
- When the change is applied
- Then `git diff` reports no change to that file
- And `tests/unit/permissions.test.ts` reports no change either
- And `pnpm test` passes, including every test in `tests/unit/permissions.test.ts`
- And no permission decision anywhere in the system is made by asking Supabase

ADR-006 calls this the most important fact in the document: `permissions.ts` imports exactly one
thing, `type Role` from the seam, and never depended on Better Auth. The provider answers *who is
this*; it is never asked *what may they do*. A change that "migrates" `ROLE_RANK` or `can()` to
Supabase has done something ADR-006 explicitly did not authorise.

**AC-8 — The application still builds and everything that passed still passes**
- Given the repository with this ticket's change applied
- When `pnpm verify` runs — typecheck, lint, unit tests, then build
- Then it exits 0
- And no test that passed before this change fails after it
- And no test is deleted, skipped, or marked pending in order to reach that result

**AC-9 — The login route renders, and no self-signup path exists (INV-08)**
- Given the application running with `DATA_SOURCE=mock`
- When I open the login route
- Then the page renders without a client-side or server-side error
- And it presents no control that creates an account
- And it presents no link to a sign-up, self-registration, or invitation-acceptance route
- And no such route is reachable anywhere in the application

**AC-10 — The self-signup configuration flag is disabled when it is absent (INV-08)**
- Given a browser with no value stored for the self-signup configuration flag
- When I open the login route
- Then the application treats self-signup as disabled
- And no control that creates an account appears
- And the page does not error on the missing value

The flag is the mechanism ADR-006 decision 7 chose, and its key, its storage shape and its permitted
values are DESIGN's to declare, not this story's (RULE-04 — the BA does not invent field names). What
this story fixes is the **default**: absent means disabled. That is not a preference, it follows from
INV-08 being an invariant — an invariant that lapses when a browser has never been used before cannot
be an invariant. A flag whose absence permitted self-signup would be a fail-open control.

**AC-11 — Enabling the flag does not produce a self-signup path (INV-08)**
- Given a browser in which the self-signup configuration flag has been set to its enabled value
- When I open the login route
- Then no control that creates an account appears
- And no sign-up, self-registration, or invitation-acceptance route becomes reachable
- And no account is created by any action available from that page

**This criterion looks like it contradicts the flag and it does not.** ADR-006 decision 7 records the
operator's choice of mechanism for disabling self-signup. It does not authorise building self-signup,
and nothing in this repository has ever had one: INV-08 forbids the route, and the `AUT` table that
would carry the feature is empty. The flag therefore ships as a configuration surface **ahead of the
thing it configures**, and its enabled branch has nothing to enable.

AC-11 exists so that fact is asserted rather than assumed. Without it, a Developer reading decision 7
could reasonably build a sign-up form behind the flag — which would create the exact route INV-08
forbids, gated by browser storage that the person being gated can edit. The criterion is the guard
against implementing the invariant's violation as a feature.

**AC-12 — The flag is not reported as an enforcement of INV-08**
- Given the change is applied
- When the ticket's artifacts are read — the implementation log, the review, and the test report
- Then none of them states or implies that INV-08 is enforced by this ticket
- And any statement about the flag records that it is client-side configuration, not a control

This is an unusual criterion and it is deliberate. `ticket.yaml` instructs that *QA should assert the
flag behaves as specified; QA should not report that INV-08 is enforced, because it is not.* An
instruction in a ticket header binds nobody once the ticket is dispatched to an agent reading the
story alone (RULE-16), so it is written as a criterion here. `localStorage` is browser storage: the
value sits on the machine of the person it restrains and one developer-console line changes it with
no server-side trace. MD-14 carries the gap and the fix shape.

## Invariants touched

`ticket.yaml` records `[INV-08]` and this story **confirms it rather than changing it**. Every ID in
`.ai/registry/invariants.md` is reasoned below, engaged or not, because check R8 has nothing to work
with when the reasoning is absent.

**Engaged:**

- **INV-08 — There is no self-signup. Accounts are created by Manager or Admin only.** This ticket
  removes the two controls that held it. `disableSignUp: true` leaves with `src/lib/auth/auth.ts`
  (AC-2) and the catch-all route handler leaves with `src/app/api/auth/` (AC-2), and what replaces
  them is a client-side flag in `localStorage` per ADR-006 decision 7. **The invariant's text does not
  change and its enforcement gets weaker.** `.ai/registry/invariants.md` says so at the invariant
  itself, `rbac-and-security.md` repeats it, and MD-14 carries it with a fix shape. AC-9 asserts the
  half of INV-08 that survives on its own — there is no route — and AC-10, AC-11 and AC-12 pin the
  flag to what it actually does.

**Not engaged, and here is why for each:**

| ID | Subject | Why this ticket cannot affect it |
|---|---|---|
| INV-01 | One occupant per seat | This ticket writes no seat and no occupancy. It changes who the system believes you are, never what a seat holds. |
| INV-02 | A person may occupy more than one seat | Same. No occupancy write exists on this ticket's surface. |
| INV-03 | A seat's ports are part of its fixed description | No port is read, created or edited. |
| INV-04 | At most one primary device per seat | No device write. `src/lib/data/` is unchanged by this ticket — it is explicitly *not* exempted from the Supabase restriction (AC-5). |
| INV-05 | A seat's primary device is owned by its occupant | Same. Owner and occupant are both domain data and this ticket touches neither. |
| INV-06 | Exiting a seat downgrades its primary device | Triggered by an occupancy write. This ticket makes none. |
| INV-07 | Devices may exist unassigned | A statement about permitted device state. Unreachable from an auth provider swap. |
| INV-10 | No two seats overlap in the grid | No placement, no grid, no seat. |
| INV-11 | Deleting a room deletes its seats, behind a confirmation | No room, no deletion path. |
| INV-12 | A Member may not be deleted while they occupy a seat or own a device | This is the nearest miss on the list and it is still a miss. ADR-003's substance — a Member can exist without a login, and deleting a login must not delete the Member — is preserved by ADR-006, which changes only the referent from Better Auth's `user` to `auth.users`. **This ticket adds no link at all** (`schema_delta: none`, out-of-scope item 1), so there is no deletion path between an identity and a Member for it to get wrong. |

INV-09 was never issued and never will be; `.ai/registry/invariants.md` records the gap deliberately.

## Permissions

**This ticket enforces no permission gate, and that is a known gap rather than an omission.** It is
the same gap `ROO-01`, `DEV-01` and `SEA-01` recorded: the `AUT` table is empty, so there is no
session, no role to read, and no rank to compare. Replacing the identity provider does not close it,
because this ticket delivers no working sign-in — see out-of-scope item 2.

The authorization model is **unchanged by this ticket and is restated here only so the reader does not
have to infer it from an absence.** It is transcribed from `.ai/standards/rbac-and-security.md`:

`ROLE_RANK`: `USER < MANAGER < ADMIN`, exported from `src/lib/auth/permissions.ts` together with
`can()`. Admin has everything including room, seat and layout CRUD; Manager approves requests, assigns
seats, and manages accounts, members and devices; User views, requests seats, and manages their own
devices.

**What must not be true after this ticket, by role:**

| Actor | Must not be able to |
|---|---|
| Unauthenticated visitor | Create an account, from any route, by any control, with the flag in any state (AC-9, AC-10, AC-11) |
| `USER` | Create an account. `canCreateAccount()` is a rank comparison and a User does not pass it; this ticket does not change that function (AC-7) |
| `MANAGER`, `ADMIN` | Create an account **through this ticket's surface** — account creation is a `MEM`/`AUT` surface and does not exist yet (out-of-scope item 6). Their permission to do so is unchanged and unexercised. |
| Any role | Have a permission decision answered by Supabase rather than by `can()` (AC-7) |

The last row is the permission consequence of ADR-006 decision 3, and it is stated as a prohibition
because that is the form in which it can be checked.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **The seam wiring, the first migration, and `Member.authUserId`.** ADR-006 decision 5 and OQ-3
   specify the column as a plain `String? @unique` with no relation and no foreign key. **This ticket
   adds none of it.** `schema_delta` is `none` and stays `none`, because `prisma/schema.prisma` is a
   DRAFT under RULE-09 and approving it is permanently human — pulling the column in would put a human
   signature gate in the middle of the loop. `ticket.yaml` records this as the reason SYS-01 exists
   separately. The ticket that does this work **has not been issued**, and this story does not issue
   it (RULE-01: the feature row is a human step).
2. **A working sign-in, sign-out, or session.** The login form is static today and stays static. No
   session is established, no cookie is set, no route is guarded. This is the `AUT` group, whose
   feature table is empty. It must not be specified against a stubbed session: a criterion that passes
   against a role read from a hard-coded value reports that authentication was verified when nothing
   was.
3. **Any schema change of any kind.** No migration is written, no model is added or edited, no
   migrations directory is created. `requires_adr` is `false` and stays `false`. If DESIGN concludes
   the switch is undeliverable without a schema change, the registry row is explicit that **that is a
   finding to raise, not a decision to take** — the ticket stops rather than acquiring a schema delta.
4. **Provider-side configuration.** Creating the Supabase project, setting the signup toggle in the
   dashboard, email templates, SMTP, redirect URLs, and OAuth providers. None of it is in this
   repository and none of it is machine-checkable from here. ADR-006 records that a Supabase project
   must exist before anything past `DATA_SOURCE=mock` can be tested; that requirement travels with
   item 1.
5. **Password reset, email verification, and OAuth sign-in.** ADR-006 lists these as the benefit of
   the switch — as *configuration rather than tickets*. Configuration still has to be turned on and
   wired, and each needs its own `AUT` feature row.
6. **Account creation by a Manager or an Admin.** INV-08's positive half — *accounts are created by
   Manager or Admin only* — needs a surface, and this ticket builds none. It belongs to `MEM` or
   `AUT`. `canCreateAccount()` already exists and is untouched (AC-7).
7. **Any change to `src/lib/auth/permissions.ts` or to the authorization model.** Asserted as AC-7
   rather than left implicit, and repeated here because *while we are in the auth directory* is how
   this file gets edited.
8. **Turning Row Level Security on.** ADR-002 decided RLS is off, and ADR-006 OQ-1's server-only
   answer is what keeps that decision valid. RLS becomes a live question only if a Supabase client
   reaches the browser, which AC-4 forbids. Reopening it is an ADR, not a ticket.
9. **Re-teaching check D12 and `eslint.config.mjs`.** ADR-006 lists both as work it authorises. **Both
   have already been done** — verified by reading, and recorded as `H-1` under Open questions. This
   ticket asserts their behaviour (AC-5, AC-6) and does not rewrite them. If DESIGN finds either
   insufficient for AC-4's `"use client"` clause, that is item 10.
10. **The two enforcement gaps this ticket knowingly leaves open**, both recorded rather than fixed:
    - **MD-14's fix shape** — an audit check that fails if any client-side signup call or
      `signUp`-shaped export exists under `src/`. ADR-006 OQ-2 records that the operator was offered
      this and chose the flag instead. Adding it here would be implementing the recommendation the
      operator declined.
    - **A `"use client"` file inside `src/lib/auth/**`.** Legal under the lint exemption, forbidden by
      AC-4, and checked by nothing automatic. Closing it needs a new check and therefore a decision.
11. **The first of ADR-006's two revert conditions.** *A row in `auth.users` whose creation cannot be
    attributed to a Manager-or-above action* cannot be observed until `auth.users` exists and holds
    rows, which is item 1. The second revert condition — an `@supabase/*` import outside the auth
    module — **is** in scope and is AC-4 and AC-6.
12. **Fixing the ten red tests in `scripts/tests/check-docs.test.mjs`.** MD-16 records that
    `pnpm hooks:test` is red because ten D12 tests assert pre-ADR-006 semantics, and that `check-docs.mjs`
    itself is correct and exits 0. That is a defect in a test suite for a script, it predates this
    ticket, and repairing it is a decision about what each test should now assert. It is named here so
    a red `hooks:test` during this ticket is recognised as inherited rather than caused. **`pnpm
    hooks:test` is not on any criterion above.**
13. **Tracker synchronization.** `sync_enabled` is `false` and the tracker is never on the critical
    path (RULE-10). `/sync-tracker` owns it.

## Open questions

Assumptions ship as written; each is falsifiable, and reversing one is an amendment to this story
(RULE-14). **Nothing in this section blocks SPEC.** Items prefixed `Q-` are questions this story
cannot answer from the registry and expects a downstream stage to answer through the clarification
channel. Items prefixed `H-` are for a human, because they are registry edits (RULE-01).

- **H-1 — ADR-006's "Affected documents" table is out of date, and three of its rows are already
  done.** The table's preamble states *"Nothing below has been changed yet except the two ADR status
  lines"*. Verified against the files on 2026-08-24: `.ai/standards/rbac-and-security.md` is at
  `doc_version: 2` with its auth section rewritten (target was 1 → 2),
  `.ai/standards/integrations.md` is at `doc_version: 3` with the Supabase Auth row reversed (target
  2 → 3), and `.ai/registry/invariants.md` is at `doc_version: 5` with INV-08's enforcement note
  written (target 4 → 5). `eslint.config.mjs` names `@supabase/*` in `no-restricted-imports` and
  exempts `src/lib/auth/**`; `scripts/check-docs.mjs` records `REWRITTEN 2026-08-24 for ADR-006`. Only
  `prisma/schema.prisma` and the implementation rows remain. **The ADR is in `.ai/registry/**` and is
  not corrected by this story** — RULE-01 makes that a human edit with an ADR and CODEOWNERS review.
  It is raised because a reader taking the table at face value would size this ticket as roughly twice
  the work it is, and out-of-scope item 9 exists to stop exactly that.
- **A-1 — Absent flag means disabled (AC-10).** ADR-006 decision 7 names the mechanism and not its
  default. This story fixes the default as fail-closed, on the grounds that a control which permits
  the thing it forbids on a browser that has never visited the site is not a control at all. Reversing
  this is an amendment here, not a decision at DESIGN.
- **A-2 — The flag's enabled branch has nothing to enable in this ticket (AC-11).** Derived from
  INV-08 forbidding the route and the `AUT` feature table being empty, not from any statement in
  ADR-006. If a human intends decision 7 to authorise **building** a self-signup path, then AC-11 is
  wrong, INV-08 is in conflict with it, and the conflict escalates under RULE-07 rather than being
  resolved at DESIGN.
- **Q-1 — Does the login page need any change at all beyond ceasing to reference Better Auth?**
  ADR-006 lists `src/app/(auth)/login/page.tsx` in its implementation row and separately records that
  the page is *a static form* with *no handler wired to it*. Whether it currently imports
  `src/lib/auth/client.ts` — which AC-2 deletes — is a `src/**` fact this story may not read (RULE-05).
  It does not block: AC-9 specifies the page's required behaviour either way, and AC-8 fails if the
  page stops building. **DESIGN is expected to establish this and enumerate the file in
  `allowed_paths` accordingly.**
- **Q-2 — Where does the self-signup flag live, and what is it named?** The key, the storage shape and
  the permitted values are contract items and belong to DESIGN under RULE-04. This story deliberately
  names none of them, and every criterion touching the flag is written against behaviour rather than
  against a key. QA takes the name from design section 6, not from this story.
- **Q-3 — Which environment variables does the server-side client need, and does `.env.example`
  change?** `integrations.md` documents `DATABASE_URL` and `DIRECT_URL` for Prisma and says nothing
  about Supabase Auth's project URL and key. This is a DESIGN item; it does not block, because no
  criterion above names an environment variable. It is raised because `.env.example` is a file DESIGN
  must decide whether to enumerate in `allowed_paths`, and a variable added without it is a variable
  nobody else knows to set.
- **Q-4 — Is `pnpm-lock.yaml` inside `allowed_paths`?** AC-1 asserts the lockfile records no
  `better-auth`, and AC-3 requires `@supabase/ssr` to be installed; both are impossible without the
  lockfile changing. Enumerating it is DESIGN's call and `check-allowed-paths.mjs` fails the ticket if
  it is missed.

## Changelog

- `2026-08-24T07:12:03Z` — initial version. Written by `ba` at SPEC. No amendments.
