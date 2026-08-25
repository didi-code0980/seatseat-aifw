---
ticket: AUT-01
stage: SPEC
agent: ba
produced_at: 2026-08-25T02:40:14Z
inputs_read: [ .ai/board/tickets/AUT-01/ticket.yaml, .ai/registry/features.md, .ai/registry/invariants.md, .ai/registry/rules.md, .ai/registry/glossary.md, .ai/registry/decisions/ADR-002-supabase-hosted-postgres.md, .ai/registry/decisions/ADR-003-member-identity.md, .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md, .ai/standards/rbac-and-security.md, .ai/standards/session-model.md, .ai/board/model-debt.md, .ai/board/backlog.md, "origin/feat/SYS-01:.ai/board/tickets/SYS-01/01-story.md", "origin/feat/SYS-01:.ai/board/tickets/SYS-01/02-design.md", "branch: feat/AUT-01, cut from origin/main" ]
consulted: []
chat_before_verdict: none
gate: BLOCKED
blocking_reason: "Q-1 — what the application does with an authenticated Supabase identity: whether it resolves a `Member` for it at all, and by what key. Route protection is named on this ticket's feature row, and route protection is the act of deciding who is admitted. `session presence alone admits` is one of three branches with different observable behaviour, not a neutral default, and its consequence is that any identity the provider authenticates reaches every surface of an application that enforces no rank anywhere (MD-14, and the Permissions section below). AC-11 and AC-12 are reserved placeholders and cannot be written without the answer. AC-1 to AC-10 are live and hold under all three branches. Nothing in `.ai/registry/**` answers Q-1; ADR-006 OQ-3 fixes the key for the day a Member is resolved and does not say whether this ticket is the ticket that resolves one."
next_state: ESCALATED
---

# AUT-01 — Sign in and sign out with Supabase Auth

Every acceptance criterion below derives from `.ai/registry/features.md`,
`.ai/registry/invariants.md`, `ADR-006`, `ADR-003`, `ADR-002` and `ticket.yaml`.
`.ai/standards/rbac-and-security.md` supplied the role scopes, the *where the check happens* rule and
the current state of INV-08's enforcement. No acceptance criterion originates in a tracker
description (RULE-17) or in `src/**` (RULE-05, never read). Where this story needed to know what
`SYS-01` delivers and what it deliberately leaves behind, it read `SYS-01`'s own artifacts on
`origin/feat/SYS-01` — board plane, not `src/**` — and cites them by name.

**This story is BLOCKED, and the block is the one `ticket.yaml` predicted.** Ten criteria are live
and complete. Two — AC-11 and AC-12 — are reserved placeholders, because they cannot be written
without a human answer to `Q-1`, and inventing either branch is prohibited (CLAUDE.md, *No
invention*). `Q-1` is stated in full under Open questions with its three branches, their
consequences, and a recommendation this story does **not** adopt.

**`next_state` reads `ESCALATED` because that is where a BLOCKED gate routes. This story does not put
the ticket there.** The state is left at `SPEC`; routing is the orchestrator's.

**Two human dependencies sit outside `Q-1` and outside `depends_on`.** `SYS-01` must be `DONE`
(DoR item 3), and a Supabase project must exist holding real values for `SUPABASE_URL` and
`SUPABASE_ANON_KEY`. Both are recorded as `H-1` and `H-2`. Neither is a reason this story is blocked;
they are reasons the ticket cannot be *built* yet, which is a different thing and is why `/spec` runs
directly out of `BACKLOG`.

## Feature

Transcribed from the `AUT — Authentication & Accounts` table of `.ai/registry/features.md` without
paraphrase:

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| AUT-01 | Sign in and sign out with Supabase Auth | AUT | PLANNED | INV-08 | Implements ADR-006 for the runtime path SYS-01 leaves out. SYS-01 removes Better Auth and constructs the `@supabase/ssr` server-side client; this row builds what uses it — a sign-in server action, session cookie handling, sign-out, and route protection, all server-side per OQ-1. **Depends on SYS-01 being DONE**, and on a Supabase project existing. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are declared by SYS-01 in `.env.example` and are consumed here, not re-declared — ADR-006 records that nothing past `DATA_SOURCE=mock` is testable until they hold real values. INV-08 is on this row because a sign-in surface is where self-signup would appear if it appeared at all; **read MD-14 before assuming the `localStorage` flag enforces anything.** 🟡 Open at SPEC: how a Supabase identity maps to a `Member` for `Member.role` while `DATA_SOURCE=mock` and `Member.authUserId` does not exist — if the answer needs the column, `schema_delta` stops being `none` and RULE-09 puts a human gate mid-loop. |

The row's own 🟡 is `Q-1`. This story does not close it.

## User value

Every surface this system has shipped — rooms, devices, members, seats — is reachable by anyone who
can reach the application, because there has never been a session to read. This ticket is the one
that makes *who is this* answerable at all: a person signs in with a credential the organization
issued them, the application carries that answer across requests in a cookie, and a person who has
not signed in is turned away from the application's routes instead of served them. Nothing here
decides *what may they do* — that is `Member.role` and `can()`, and it is untouched (ADR-006
decision 3). The value is the first half of the sentence, and the second half is unreachable without
it.

## Acceptance criteria

**Every criterion below is observable from outside the system**, and observable *without a Supabase
project* only in part — see `H-2`. AC-2, AC-3, AC-4, AC-8, AC-9 and AC-10 need an identity the
provider will accept or reject, which does not exist until a human creates the project. That is
recorded rather than worked around: a criterion asserting sign-in against a stubbed provider would
report that authentication was verified when nothing was, which is the error `SYS-01`'s out-of-scope
item 2 was written to prevent.

**"Protected route" means a route this ticket guards.** Which routes those are is `Q-2`, and DESIGN
enumerates them; every criterion below is written against *a* protected route rather than a named
one, so the criteria survive the enumeration. **"The sign-in surface" means the route the sign-in
form occupies.** DESIGN names it — this story may not read `src/**` (RULE-05) and no registry
document names a route.

**A note on AC-11 and AC-12.** Both are reserved placeholders while `Q-1` is open, for the same
reason and by the same mechanism MEM-01 used for its AC-10 and AC-11: the behaviour they describe is
unspecified and this story is forbidden to invent it. They are numbered and reserved rather than left
to be appended, so that answering `Q-1` amends this story under RULE-14 without renumbering anything
QA has mapped a test to.

**No criterion below asserts a role, a rank, or a permission.** That is not an omission to be fixed
at DESIGN; it is `Q-1`'s subject and out-of-scope items 2 and 3.

### The sign-in surface

**AC-1 — The sign-in surface collects a credential and offers no way to create an account**
- Given I am not signed in
- When I request the sign-in surface
- Then a form is presented that collects an email address and a password
- And a control that submits those credentials is present
- And no control on the page creates an account, requests an invitation, or registers a new user
- And no link on the page leads to a route that does

This is INV-08 stated as a criterion about *this* surface rather than about the system. It is a
refusal, and it is the criterion in this story whose removal would be least visible: a sign-up link
added later looks like a feature, not like a violation.

### Signing in

**AC-2 — Credentials the provider accepts establish a session**
- Given an identity exists in the authentication provider with a known email address and password
- And I am not signed in
- When I submit that email address and that password on the sign-in form
- Then a session cookie is set on my browser
- And the sign-in form is not presented to me again
- And a control that signs me out is reachable

**AC-3 — A wrong password establishes no session**
- Given an identity exists in the authentication provider with a known email address
- When I submit that email address with a password that is not its password
- Then no session cookie is set
- And I remain on the sign-in surface
- And a message states that the credentials are not valid

**AC-4 — An email address no identity holds is refused in exactly the terms AC-3 uses**
- Given no identity in the authentication provider holds a given email address
- When I submit that email address with any password
- Then no session cookie is set
- And I remain on the sign-in surface
- And the message shown is the same message AC-3 produces, character for character
- And nothing in the response distinguishes this case from AC-3

Separate from AC-3 because it is a different scenario with a different Given, and because folding the
two together loses the clause that matters. A refusal that says *no such account* is an enumeration
oracle: it turns the sign-in form into a way to test whether a person is in the organization, and it
does so for anyone on the network. This is the one criterion here that constrains the *wording* of a
message rather than the outcome, and it does so deliberately.

**AC-5 — An empty or malformed submission is refused at the form**
- Given I am on the sign-in form
- When I submit with the email address empty or consisting only of whitespace, or with the password
  empty, or with an email address that is not well-formed
- Then no session cookie is set
- And a validation message is shown against each offending field
- And I remain on the sign-in surface

The ordering rule — validate, then authorize, then call the seam — is
`.ai/standards/rbac-and-security.md`'s and the coding standards', and it is DESIGN's to specify and
REVIEW's to check. It is not asserted here, because from outside the system a refusal that never
reached the provider and a refusal that did are indistinguishable.

### Staying signed in, and stopping

**AC-6 — An unauthenticated request to a protected route is turned away and is served no protected content**
- Given I am not signed in
- When I request a protected route directly by its URL
- Then I am taken to the sign-in surface
- And the response contains none of the data that route renders for a signed-in person

The second clause is the one worth keeping. A redirect that arrives after the protected content has
already been rendered into the response is a redirect that leaked the page, and from a browser it
looks identical to a redirect that did not.

**AC-7 — Signing out ends the session**
- Given I am signed in
- When I activate the sign-out control
- Then the session cookie is cleared
- And I am taken to the sign-in surface
- And requesting the protected route from AC-6 again takes me to the sign-in surface
- And returning to the previous page through the browser's history does not present protected content

**AC-8 — The session survives a reload and a navigation**
- Given I am signed in and on a protected route
- When I reload that page, and then navigate to a second protected route
- Then I am not taken to the sign-in surface on either
- And I am not asked for a credential again

This is the criterion the feature row means by *session cookie handling*, and it is the one that
fails when a session is established but never refreshed on a subsequent request.

### What must not happen

**AC-9 — The browser never talks to the authentication provider, and never holds its credentials**
- Given I am on the sign-in surface
- When I submit credentials the provider accepts, and the application signs me in
- Then no network request issued by the browser is addressed to the Supabase host
- And no document or script the application serves contains the value of `SUPABASE_URL` or of
  `SUPABASE_ANON_KEY`

ADR-006 OQ-1, stated as a criterion because it is the premise ADR-002 rested on when it left Row
Level Security off, and because it is ADR-006's second revert condition. `SYS-01` asserts the same
property statically — the lint restriction, check D12, and a runtime `throw` in the client factory.
This asserts it dynamically, at the one moment a credential is actually in flight. Neither replaces
the other: a static check cannot see a fetch, and a dynamic check cannot see a file nobody executed.

**AC-10 — Signing in creates no Member and changes none**
- Given the set of Members the system records is known
- When I attempt to sign in with an identity the provider accepts, and then sign out, and then attempt
  to sign in with it again
- Then no Member has been created
- And no Member's recorded attributes have changed

INV-08, in the shape it actually takes on this surface. *Create the Member on first sign-in* is the
convenient answer to `Q-1`, it is how nearly every application in the world does it, and it is
self-signup with the sign-up form removed: the account is created by the person signing in, and no
Manager or Admin was involved. This criterion forbids it, and it forbids it under every branch of
`Q-1`, which is why it is live rather than reserved. It says *attempt to sign in* rather than *sign
in* for the same reason: it holds whether the application admits that identity or turns it away.

### Reserved — blocked on Q-1

**AC-11 — RESERVED. What the application does with an authenticated identity for which it holds no
Member.** Admit it with no role, or refuse it and end the session. Both are writable as criteria;
which one is true is a human decision. See `Q-1`.

**AC-12 — RESERVED. The role the application resolves for a signed-in identity, and the key it
resolves it by.** Falls away entirely under `Q-1` branch (a), in which this ticket resolves no
Member and no role. See `Q-1`.

## Invariants touched

`[INV-08]`. **Confirmed rather than changed** — the list is exactly what `ticket.yaml` and the
feature row transcribed, and this story neither extends nor narrows it. SEA-01 extended its
transcribed four to seven and MEM-01 narrowed its four to two; this one holds, and the reasoning for
every other ledger ID is below rather than assumed.

The list records what this change **could** affect, not what survives the mitigation. AC-1 and AC-10
exist *because* INV-08 is in play; concluding from their presence that it is not would be the
circular reasoning `.ai/registry/invariants.md` warns against.

**Engaged:**

- **INV-08** (there is no self-signup; accounts are created by Manager or Admin only) — this is the
  surface a person would sign themselves up on if the system let them, and it is the surface on which
  an account would be silently minted if signing in provisioned a Member. AC-1 forbids the visible
  form of that; AC-10 forbids the invisible one. **Neither of them enforces the invariant, and this
  story will not claim they do.** What holds INV-08 today is a client-side flag in `localStorage`,
  which `.ai/registry/invariants.md` says at the invariant itself, `ADR-006` OQ-2 records as the
  operator's decision against the steward's recommendation, and MD-14 carries with its fix shape. A
  flag in browser storage sits on the machine of the person it restrains. **QA should assert that the
  criteria above hold and must not report that INV-08 is enforced** — `ticket.yaml` asks for exactly
  that and it is repeated here, because a test report saying *self-signup is disabled* without saying
  *by browser storage* has said something false.

**Not engaged, having been reasoned through.** No criterion above creates, reads, or writes a room, a
seat, a device, an occupancy, or a placement. This ticket adds a session and a guard in front of
routes that already exist; it changes nothing those routes then do.

- **INV-01** (a seat has at most one occupant) — no occupancy is written or read.
- **INV-02** (one person may occupy multiple seats) — the invariant is the absence of a cardinality
  constraint and nothing here adds one.
- **INV-03** (seat status is derived, never stored) — no seat status is computed, cached, or stored.
  It would become engaged if a session carried a precomputed view of anything derived, and no
  criterion asks it to.
- **INV-04**, **INV-05**, **INV-06** (primary device cardinality, ownership, and the auto-downgrade on
  exit) — no device is created, assigned, designated, or released, and no occupant exits a seat.
- **INV-07** (devices may exist unassigned in inventory) — nothing here assigns or unassigns.
- **INV-10** (no two seats overlap within a room) — no seat is placed and no grid coordinate is read.
- **INV-11** (deleting a room deletes its seats, behind a confirmation naming the count) — no room is
  reachable from this surface and no delete path is touched. Route protection sits *in front of* the
  room surface; a guard that turns a request away cannot make a cascade wrong.
- **INV-12** (a Member may not be deleted while they occupy a seat or owns a device) — no Member is
  deleted here. AC-10 asserts no Member is *created or changed*, which is INV-12 left alone rather
  than upheld.

`INV-09` is unissued and cannot be touched by anything.

**One indirect chain was walked and found not to reach.** `.ai/registry/invariants.md` requires it:
an invariant reached through a cascade is still reached. The chain considered was
*sign-in → resolve a Member → the resolved Member's occupancy and devices*. It does not reach,
because under every branch of `Q-1` this ticket **reads** at most one Member row and writes none, and
none of INV-01 through INV-07 is a statement about reading. It would reach the moment sign-in
*created* a Member, which AC-10 forbids for INV-08's reasons before these ones ever apply.

## Permissions

**This ticket introduces authentication. It introduces no authorization, and the gap between those
two words is the whole of `Q-1`.**

`.ai/standards/rbac-and-security.md` answers permission questions by rank comparison over
`ROLE_RANK: USER < MANAGER < ADMIN`, reading the rank from `Member.role`, and requires the check to
happen **in the server action, every time**. None of that changes here and none of it is exercised
here: no criterion above reads a role, and under `Q-1` branch (a) the application never holds one.

| Actor | Reach the sign-in surface | Sign in | Hold a session | Reach a protected route | Sign out |
|---|---|---|---|---|---|
| Unauthenticated | yes | yes, with a credential the provider accepts | no | **no** — AC-6 | n/a |
| Authenticated | yes, and see `Q-4` | n/a | yes | **yes** — and see below | yes — AC-7 |
| `ADMIN`, `MANAGER`, `USER` | identical to *Authenticated* on every column | | | | |

The last row is not a formatting shortcut. **After this ticket, the only question any surface in this
system can ask is whether the caller is signed in.** No rank distinction exists to make, because
`Q-1` is what would give the application a `Member.role` to compare, and no shipped surface enforces
a rank in any case — MEM-01's own Permissions section records that anyone who can reach the
application can create a member with the `ADMIN` role, and that is still true the moment this ticket
ships.

**The consequence a human has to accept explicitly, and the reason `Q-1` blocks rather than defers.**
Under branch (a) — session presence alone admits — the reach of any identity the provider
authenticates is the whole application: every room, every seat, every device, every member, and the
role selector on the member form. INV-08 is what is supposed to make *any identity the provider
authenticates* a small and deliberately-issued set, and INV-08 is currently held by a flag in browser
storage (MD-14). Chained, those two facts mean that whoever can flip a `localStorage` value and reach
the provider's signup endpoint can be inside this application with `ADMIN`-equivalent reach. That may
be an entirely acceptable price for a system running against `DATA_SOURCE=mock` with no real data in
it — MEM-01 and SEA-01 both shipped accepting the ungated half of it. **It is not a price a BA may
accept on the operator's behalf while writing the criterion that admits the request**, which is
precisely what AC-11 would be.

When rank gating is built, it belongs in the server action on every operation, not in
`PermissionGate` — a hidden control over an unchecked action is an open action. That is
`rbac-and-security.md`'s rule, and it is recorded here for the ticket that inherits it (out-of-scope
item 2), not implemented by this one.

## Out of scope

Non-empty and specific. Each item names where the work goes instead.

1. **Creating accounts.** INV-08's positive half — *accounts are created by Manager or Admin only* —
   needs a surface, and this ticket builds none. `ticket.yaml` records that two of the five deseeded
   tickets are still waiting on `AUT` feature rows, *Account management UI* and *Role assignment UI*,
   and that **neither of them is this one**. No feature row is created by this story; that is the
   human BACKLOG step (RULE-01). `canCreateAccount()` already exists and is untouched.
2. **Any rank gate on any surface.** Guarding a route or an action by `ADMIN`, `MANAGER` or `USER`,
   and the ownership check that goes with *manage their own devices*. This ticket guards by session
   presence and nothing else. Goes to the `AUT` rows in item 1, and to whatever ticket first needs a
   rank — which is also the first ticket that needs `Q-1` answered, whatever this one decides.
3. **`Member.authUserId`, the schema, and the first migration.** ADR-006 decision 5 and OQ-3 specify
   the column as a plain `String? @unique` with no relation and no foreign key. `SYS-01`'s
   out-of-scope item 1 parks it and records that **the ticket that does this work has not been
   issued**. This story does not issue it either, and `schema_delta` stays `none` — **conditionally**:
   under `Q-1` branch (c) this ticket becomes that ticket, `schema_delta` stops being `none`, and
   `prisma/schema.prisma` is a DRAFT under RULE-09, which puts a human signature in the middle of the
   loop. That is stated at `Q-1` rather than decided here.
4. **Password reset, email verification, magic links, OAuth sign-in, and multi-factor.** ADR-006
   lists the first three as the benefit of the switch — *configuration rather than tickets* — and
   configuration still has to be turned on and wired. Each needs its own `AUT` feature row.
   `SYS-01`'s out-of-scope item 5 says the same of the same list.
5. **Provider-side configuration.** Creating the Supabase project, the signup toggle in the
   dashboard, email templates, SMTP, redirect URLs, and OAuth providers. None of it is in this
   repository and none of it is machine-checkable from here. It is `H-2`.
6. **The self-signup `localStorage` flag.** `SYS-01` delivers it — the key, its values, and the
   notice that renders it — and this ticket neither reimplements it, nor moves it, nor strengthens
   it. **MD-14's fix shape is explicitly not adopted here**: an audit check failing on any
   client-side signup call under `src/` is the third control ADR-006 OQ-2 offered the operator, and
   the operator chose the flag instead. Adding it here would be implementing a recommendation that
   was declined.
7. **Session lifetime, remember-me, idle timeout, and refresh-token rotation policy.** No registry
   document states a session duration and this story does not invent one. AC-8 asserts a session
   survives a reload and a navigation; it asserts nothing about how long it survives. A duration is a
   feature row or provider configuration.
8. **Rate limiting, lockout after repeated failures, and CAPTCHA.** AC-4 removes the enumeration
   oracle from the *message*; it does nothing about an attacker who simply tries. Nothing in the
   registry requires a limit and nothing here builds one.
9. **A record of who signed in and when.** No sign-in audit log, no last-seen timestamp, no session
   list, no *sign out my other devices*. It is named rather than omitted because *who was signed in
   when this happened* is the first question anyone asks after an incident, and the answer for
   AUT-01 is that the system does not record it.
10. **Impersonation.** *Sign in as* for an Admin. It is a rank capability and needs its own row.
11. **Any change to `src/lib/auth/permissions.ts` or to the authorization model.** `ROLE_RANK`,
    `can()`, `canCreateAccount()`, `canManageRooms()`, `canApproveRequests()` are untouched — ADR-006
    decision 3, and `SYS-01`'s out-of-scope item 7. Named here for the same reason `SYS-01` named it:
    *while we are in the auth directory* is how this file gets edited.
12. **Turning Row Level Security on.** ADR-002 decided it is off, and ADR-006 OQ-1's server-only
    answer is what keeps that decision valid. AC-9 is what keeps the question moot. Reopening it is
    an ADR, not a ticket.
13. **Sign-in surface presentation beyond the form.** Branding, illustration, a remember-me checkbox,
    social buttons, and any redesign of the page. The visual direction in `CLAUDE.md` and
    `ui-design-system.md` applies to what is built; nothing here is a licence to rebuild the page.
14. **Fixing MD-16's ten red `check-docs` tests.** `pnpm hooks:test` is red on `main` because ten D12
    tests assert pre-ADR-006 semantics while `check-docs.mjs` itself exits 0. It predates this ticket,
    it belongs to whoever landed ADR-006, and it is named here so a red `hooks:test` during this
    ticket is recognised as inherited rather than caused.
15. **Tracker synchronization.** `sync_enabled` is `false` and the tracker is never on the critical
    path (RULE-10). `/sync-tracker` owns it.

## Open questions

Items prefixed `Q-` are questions this story cannot answer from the registry; `H-` are human
dependencies that gate the work rather than the writing. **`Q-1` blocks this stage. Nothing else
here does.**

### Q-1 — BLOCKING — Does this ticket resolve a `Member` for the signed-in identity, and if so by what key?

**Routed to:** the operator. **Raised by:** `ba`, SPEC. **Blocks:** this gate, AC-11 and AC-12.

The 🟡 on the feature row, and the question `ticket.yaml` was seeded to put in front of a human.
Nothing in `.ai/registry/**` answers it. ADR-006 OQ-3 fixes *the key for the day a Member is
resolved* — `Member.authUserId`, a plain `String? @unique` — and says nothing about whether this
ticket is the ticket that resolves one. `SYS-01`'s out-of-scope item 1 records that the ticket which
adds that column **has not been issued**.

Three branches. They differ in observable behaviour, so no criterion can be written across them.

**(a) Resolve nothing. Session presence alone admits.** This ticket delivers authentication and no
identity mapping at all. AC-11 becomes *an authenticated identity is admitted, and the application
resolves no Member and no role for it*; AC-12 falls away. `schema_delta` stays `none`, nothing is
invented, and no later ticket unwinds anything.
*The price:* the whole of the Permissions section above. Any identity the provider authenticates
reaches every surface, and INV-08 — the thing that is supposed to keep that set small — is held by a
flag in browser storage (MD-14).

**(b) Resolve by email, as a declared temporary convention.** The signed-in identity's email is
matched against `Member.email`, which exists and is `@unique`. Testable **today**, against
`DATA_SOURCE=mock` and the seeded fixtures, with no schema change and no Supabase project — it is the
only branch of the three that is. `schema_delta` stays `none`.
*The price:* email becomes a second identity key alongside the one ADR-006 OQ-3 chose, which
contradicts the direction of an accepted ADR rather than a preference; a later ticket unwinds it; and
`ticket.yaml` names this outcome in advance — *a mock-only convention that a later ticket has to
unwind*. It also needs AC-11 to say what happens when the email matches nothing, which is the same
decision branch (a) makes, arrived at from the other side.

**(c) Resolve by `Member.authUserId`, and add the column here.** ADR-006 OQ-3 implemented in the
ticket that first needs it.
*The price:* `schema_delta` stops being `none` and `prisma/schema.prisma` is a DRAFT under RULE-09,
so a human signature lands in the middle of the loop — the trap `SYS-01`'s row was written to avoid.
And it buys nothing observable yet: there is no database, no migration has ever been applied, no
Supabase project exists to mint a UUID, and the mock fixtures hold no `authUserId` values. It is
correct and it is untestable, in the same breath.

**The recommendation, which this story states and does not adopt: (a), if and only if the operator
accepts the Permissions section's consequence in those words; otherwise (b), declared in the design
as temporary and named in the ticket that unwinds it.** (c) is the right end state and the wrong
ticket for it: paying RULE-09's human gate to add a column that nothing can populate defers the
benefit and takes the cost now. What makes this a human decision rather than a BA's is not which
branch is tidier — it is that (a) writes the criterion admitting every authenticated request into an
application with no rank gate anywhere, and that is a security decision about a system whose INV-08
enforcement has already lapsed once.

**Whatever the answer, AC-10 stands.** No branch may provision a Member on first sign-in; that is
self-signup with the form removed, and it is INV-08, not a design preference.

### Q-2 — Which routes are protected, enumerated

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing. **Blocks `/qa`:** yes.

Every criterion above is written against *a* protected route because no registry document names a
route and this story may not read `src/**` (RULE-05). DESIGN enumerates them, names the sign-in
surface's own route, and states whether anything is deliberately left unguarded. QA cannot write
AC-6, AC-7 or AC-8 without that list, and section 6 of the design is the only channel through which
it may reach QA.

### Q-3 — Does the session need a middleware, and does this ticket edit a file `SYS-01` wrote?

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing. **Decides:** `allowed_paths`.

`SYS-01`'s design says of its own client factory that swallowing a cookie-write failure in a server
component is the documented pattern *"a middleware refreshes the session instead, and this ticket has
no middleware because it has no session"*. This is the ticket that has the session. Whether the
factory as delivered suffices, or whether a middleware is required for AC-8, decides whether
`allowed_paths` reaches into `src/lib/auth/**` and touches a file another ticket authored. RULE-04
makes it a contract question, not an implementation detail.

### Q-4 — What happens when a signed-in person requests the sign-in surface?

**Routed to:** `tech-lead-design`, DESIGN. **Blocks:** nothing.

Redirected away, or shown the form again. Conventional practice is to redirect, and convention is not
a source this story may cite. No criterion above asserts either, deliberately: it is a behaviour with
no invariant and no registry statement behind it, and inventing an AC for it would put QA to work
proving a preference. If DESIGN chooses to redirect, it is an amendment to this story under RULE-14,
not a clause added at DESIGN.

### H-1 — `SYS-01` must be `DONE`, and is not

**For:** the orchestrator, at DoR. **Not a defect.**

`depends_on: [SYS-01]` and DoR item 3 requires every dependency to be `DONE`. `SYS-01` passed SPEC
and DESIGN on 2026-08-24 and is `IN_PROGRESS`, queued for `/implement`; its artifacts live on
`origin/feat/SYS-01` and have not merged. **On this branch, cut from `origin/main`,
`.ai/board/tickets/SYS-01/ticket.yaml` still reads `state: BACKLOG` with all four gates `false` and
holds no story or design.** That is the unmerged lane, not a board inconsistency, and it is written
here so a reader of `feat/AUT-01` does not file it as one.

This ticket may sit at `SPEC` indefinitely without that being a failure. `/spec` runs directly out of
`BACKLOG` and this story does not depend on `SYS-01` having shipped — only on its decisions, which are
ADR-006's and are accepted.

### H-2 — A Supabase project must exist before any of this is testable

**For:** the operator. **Not expressible in `depends_on`.**

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are declared by `SYS-01` in `.env.example` and consumed here,
not re-declared. ADR-006 records that they hold no real values, and `SYS-01`'s design records that its
client factory throws on an absent credential by design. Six of the ten live criteria — AC-2, AC-3,
AC-4, AC-8, AC-9, AC-10 — need an identity a provider will accept or reject, and none of them can be
demonstrated until a human creates the project, sets the two values, and creates at least one
identity. AC-1, AC-5, AC-6 and AC-7's redirect half are demonstrable without it.

This is written at SPEC rather than discovered at QA, which is `ticket.yaml`'s instruction and the
reason it is a section rather than a sentence.

## Changelog

- `2026-08-25T02:40:14Z` — initial. Ten live criteria, two reserved on `Q-1`. `invariants_touched`
  confirmed at `[INV-08]`; `size_estimate` written `M`. Written by `ba`.
