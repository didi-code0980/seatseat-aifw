---
doc_version: 10
last_updated: 2026-08-26
governed_by: [RULE-01, RULE-17]
---

# Feature registry

**The single ledger for every feature this project knows about, at every stage of certainty** — built,
being built, agreed, merely proposed, or retired. ADR-008. There is no second file: if the project has
an opinion about a feature, it is a row here.

A story may only be written against a feature ID that exists in this file (Definition of Ready). Text
arriving from the tracker is context, never a source of feature IDs — see RULE-17.

**A human decides a row; an agent may type it.** RULE-01 requires an ADR and human approval, and the
approval is CODEOWNERS review **on the pull request** — at merge, not at write. This paragraph used to
say the file was human-only and that an agent needing a change here must stop with `gate: BLOCKED`;
that was struck on 2026-08-26 as MD-24, after it had cost the operator two questions. `/pull-tickets`
is still explicitly forbidden from writing to this file, because tracker text is untrusted input
(RULE-17) and that is a different reason from authorship.

Tables are populated incrementally. An empty group table means nothing in that group has been recorded
yet. A ticket whose `feature_ids` do not all resolve to a row below — or that resolve to an `OUTDATED`
row — fails Definition of Ready and is demoted to BACKLOG.

## Columns

`ID` — group prefix plus a two-digit number, for example `ROO-01`. **May be empty**; see Status.
`Status` — one of the six below.
`Title` — the feature name, transcribed without paraphrase.
`Description` — what the feature *is*, in a sentence or two. Not its history; that is `Notes`.
`Group` — one of the ten fixed prefixes.
`Invariants touched` — IDs from `.ai/registry/invariants.md`, or `[]`.
`Notes` — free text: row history, corrections, the decision trail, and for a `RECOMMEND` row the
ticket that raised it. A 🟡 marker means the row is known-incomplete and needs a human decision before
it can reach READY.

## Status

Six values, per ADR-008. The enum was `PLANNED`, `IN_PROGRESS`, `DONE`, `DEFERRED` until 2026-08-26;
`DEFERRED` was never used by any row and is retired.

| Status | Means | ID | Written by |
|---|---|---|---|
| `TRIAGE` | Proposed — by an agent, or from an idea — and **not yet verified by the operator** | **empty** | anyone |
| `RECOMMEND` | Recorded as out-of-scope while building something else. Nobody has decided to build it | **empty** | the stage that found it |
| `PLANNED` | Verified and wanted. A ticket may be seeded against it | required | `orchestrator`, when the operator names the work — merged by the operator |
| `IN_PROGRESS` | A ticket exists and is in flight | required | see MD-41 — nothing writes this yet |
| `DONE` | **Merged into `main`**, not gated | required | `orchestrator` at `/ship` step 3 |
| `OUTDATED` | No longer true or no longer wanted. Kept as a record, never deleted | either | the operator |

**`TRIAGE` and `RECOMMEND` rows have no ID, and that is the enforcement rather than a formatting
rule.** An ID is what makes a feature citable: check D1 resolves it and Definition of Ready accepts
it. Both ask whether a row *exists*, not whether anyone agreed with it — so an unverified proposal
holding an ID is a proposal an agent can write a story against with every check passing. Check D14
fails the audit on a `TRIAGE` or `RECOMMEND` row that has one.

**`DONE` means merged into `main`.** A feature whose four gates have all passed but whose pull request
is still open is not `DONE`; the registry records what the product contains, and an unmerged branch is
not in the product. Written by `orchestrator` at `/ship` step 3, on the `ops/` branch of that ship —
never on the ticket branch, which `scripts/check-allowed-paths.mjs` would fail. The clause and the
writer were both added 2026-08-25: until then this column had no owner and drifted for two shipped
tickets (MD-29).

**Promotion is the operator's decision and the `orchestrator` types it.** A `TRIAGE` or `RECOMMEND`
row becomes `PLANNED` when it is given an ID. The operator decides by **saying what they want built**;
the orchestrator writes the row without waiting to be asked twice; the operator confirms by
**merging**, because merging is RULE-09. ADR-008 clause 6, and the contract the orchestrator works to
is in `.claude/agents/orchestrator.md` — search the ledger and promote a match rather than adding a
second row, transcribe the title from their words, `[]` for invariants unless they named one, and
never issue an ID for a proposal nobody agreed to.

**Written and merged are different claims.** A row on a branch is a proposal; a row on `main` is the
registry. Whoever reports the write says which one has happened.

## Group prefixes

Fixed and confirmed. Extending this set requires an ADR. Section headings below must match these
expansions exactly.

| Prefix | Expansion | Prefix | Expansion |
|--------|-----------|--------|-----------|
| `AUT` | Authentication & Accounts | `GRP` | Groups |
| `ROO` | Rooms | `LAY` | Layout Designer |
| `SEA` | Seats | `REG` | Seat Requests |
| `DEV` | Devices | `DSH` | Dashboard |
| `MEM` | Members | `SYS` | System |

## AUT — Authentication & Accounts

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| | TRIAGE | Sign in and sign out with Supabase Auth | A person signs in and signs out, and the application knows who is making a request. | AUT | INV-08 | **Issued, seeded, specified, then withdrawn by the operator on 2026-08-24** to be discussed with product; the row was deleted with it in commit `1148108`, which is why the group table read empty for two days. The story survives at `fdfe96a` on an unmerged branch as an archive — ten live acceptance criteria, the invariants, the permission model and an explicit out-of-scope. **Blocked on one product question, not a technical one:** does signing in resolve a `Member` for the signed-in identity, and if so by what key? Three branches are enumerated in `.ai/board/ideas/2026-08-25-supabase-consolidation-scope-unsettled.md` and none is chosen. `SYS-01` swapped the provider underneath this; it delivered no sign-in surface and never claimed to. |
| | TRIAGE | Account management UI | A Manager or an Admin creates and manages accounts. | AUT | INV-08 | Seeded in Phase C, deseeded, and never issued a row. INV-08 says accounts are created by Manager or Admin only, and **no surface in the product does it** — the invariant currently has no implementation to guard. Read MD-14 before assuming the `localStorage` flag ADR-006 records enforces anything. |
| | TRIAGE | Role assignment UI | A Manager or an Admin changes a member's role. | AUT | [] | Seeded in Phase C, deseeded, and never issued a row. `Member.role` is the source of role and `can()` is the only comparison; nothing lets a person change the value. |
| | RECOMMEND | Rank guard on the shipped CRUD surfaces | Every shipped surface applies the rank check its design names, against the signed-in person. | AUT | INV-08 | **Raised as out-of-scope by three tickets and never picked up.** `ROO-01`'s row says *"Auth guard deferred to AUT"*; `DEV-01` out-of-scope item 1 and `MEM-01` out-of-scope item 1 both exclude *"sessions, roles, and any guard on this surface"*. `PermissionGate` exists and is deliberately called from nowhere, because a control wrapped in a gate fed a hard-coded role renders a surface that looks guarded and is not. **This cannot start before the sign-in row above**: there is no session to gate on. |

## ROO — Rooms

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| ROO-01 | DONE | Room CRUD UI | Create, list, edit and delete rooms. Deleting a room destroys its seats, and the interface confirms by naming how many will be lost. | ROO | INV-01, INV-04, INV-05, INV-06, INV-07, INV-10, INV-11 | First loop-validation slice. Auth guard deferred to AUT. Merged in PR #1, 2026-08-23. |

## SEA — Seats

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| SEA-01 | DONE | Seat occupancy — assign and release | Assign an occupant to an existing seat and release them. Placement is not part of it. | SEA | INV-01, INV-02, INV-03, INV-06 | **Corrected 2026-08-25.** The row read `IN_PROGRESS` with a note saying the branch was pushed and no pull request was open. Both stopped being true when `feat/SEA-01` merged, and nothing updated it: `/ship` step 3 only gained the registry `Status` write on 2026-08-25, *after* SEA-01 shipped, so this is the one row the new step will never reach on its own. MD-29's column, one ticket wide. Fourth slice, specced parallel to MEM-01's implementation. **Placement is deliberately out of this row**: INV-10 governs grid overlap, and `types.ts:77` assigns it to every LAY ticket. SPEC must confirm the split before DESIGN — if placement is pulled in, INV-10 joins this list and the ticket becomes LAY's problem instead. INV-06 is the reason this ticket writes `mock/devices.ts`: releasing an occupant auto-downgrades that seat's primary device. |
| | RECOMMEND | Network ports on a seat | A seat's network ports, recorded as part of its fixed physical description. | SEA | [] | **Named in the charter as one of the three things this system manages, and it has never had a row.** Raised as out-of-scope twice: `DEV-01` item 3 and `SEA-01` item 2, both saying *"a port belongs to a seat and is part of that seat's fixed physical description"*. Neither ticket built it and no ticket has been seeded for it. |

## DEV — Devices

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| DEV-01 | DONE | Device CRUD UI | Create, list, edit and delete devices, assign them to seats, and designate one primary device per seat. A device may sit unassigned in inventory. | DEV | INV-04, INV-05, INV-06, INV-07 | Second CRUD slice — tests whether the ROO-01 pattern transfers. Mock-backed. Merged in PR #7, 2026-08-23; first ticket through the loop with `rework_count: 0` and no escalation. **Status corrected 2026-08-25** — it read `PLANNED` for two days because no command wrote this column (MD-29). |

## MEM — Members

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| MEM-01 | DONE | Member CRUD UI | Create, list, edit and delete members. Deletion is refused while the member occupies a seat or owns a device, rather than cascading. | MEM | INV-08, INV-12 | Merged in PR #17, 2026-08-24. **Status corrected 2026-08-25**, same cause as DEV-01 (MD-29). Third CRUD slice, first row written by an agent (ADR-004). Member deletion resolved to a **refusal** at SPEC — ADR-005, which issues INV-12. INV-01, INV-05 and INV-06 were on this row conditionally and fall away with that answer; INV-12 is on it because MEM-01 is the ticket that implements the deletion INV-12 governs. |

## GRP — Groups

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| GRP-01 | DONE | Group CRUD UI | Create groups, list them as a tree, rename, move a group's parent, and delete. Assigning members to groups is not part of it. | GRP | [] | The first GRP row. Member assignment deferred to GRP-02. Q-1 resolved to Refuse, Q-2 resolved to Detach (INV-12 unengaged). **`DONE` written by `/ship` step 3, 2026-08-26 — the first time any command has written this column.** MD-29 records the three features whose Status was corrected after the fact; MD-41 records the hand-set `IN_PROGRESS` this replaces, written because nothing wrote the column before `/ship`. `DONE` means **merged**, and here it is already true rather than anticipated: PR #42 merged at 2026-08-26T02:49:03Z, ahead of this row. |
| GRP-02 | PLANNED | Member assignment to groups | Assign and re-assign a Member to a Group, and restore the group column to the members list. | GRP | [] | **Typed by an agent, decided by the operator — `/ship GRP-01`, 2026-08-26, under `.ai/01-operating-model.md`'s *"a human decides the row; an agent may type it"* (MD-24, 2026-08-26). The decision is quoted, not inferred:** the operator's own GRP-01 row reads *"Member assignment deferred to GRP-02"*, and `03-impl-log.md:10` records their Q-0 answer as *"scope approved as Group CRUD UI; member assignment deferred to GRP-02"*. The `Description` is transcribed from GRP-01's out-of-scope item 1 and `02-design.md:435`, not composed. **Written because check D1 was failing four of GRP-01's gate-passed artifacts** — `01-story.md`, `02-design.md`, `03-impl-log.md` and `05-test-plan.md` all cite `GRP-02`, no row existed, and CI's `verify` job stopped at `docs-audit` so PR #42 could not merge. The failure predates ADR-008; it went unseen because `docs-audit` had been red on `main` since SYS-01, so the step never ran. **`PLANNED` rather than `RECOMMEND`, and that choice is forced rather than preferred.** `RECOMMEND` is the honest status for work nobody has scheduled, but ADR-008 clause 3 gives `RECOMMEND` no ID by design, and an ID is exactly what D1 must resolve. If the intent is that GRP-01's artifacts should not have cited an unissued feature at all, the repair is a steward change to D1 and this row should be refused. **`Invariants touched` is `[]` provisionally** — nothing in `invariants.md` mentions Group, but `src/lib/data/mock/members.ts` is MEM's surface and the BA determines the real set at SPEC, exactly as REG-01's row says of its own. No ticket is seeded against this row by this change. |

## LAY — Layout Designer

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| | RECOMMEND | Seat placement on the room grid | Place seats on a room's grid by drag and drop. A placement is a grid coordinate plus a rectangular footprint, and no two seats in a room may overlap a cell. | LAY | INV-10 | **Carries the only invariant in the ledger that has never been implemented.** Raised as out-of-scope by `SEA-01` item 1 — *"placement and everything spatial"* — and by `ROO-01` item 2. `SEA-01`'s own row records that INV-10 is assigned to every LAY ticket. dnd-kit is installed and deliberately unwired, *"because a half-built interaction is harder to replace than an empty frame."* The backlog calls this the heavier of the startable choices and leaves it open. |

## REG — Seat Requests

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| REG-01 | PLANNED | User self-release and seat request workflow | A person releases the seat they occupy, and requests a seat through an approval workflow. | REG | [] | 🟡 **Row written 2026-08-25 to make an existing ticket legal, not to plan the work.** A `ticket.yaml` for REG-01 was seeded on 2026-08-25 with no row behind it — check D1 failed on the first document that cited the ID. The title is transcribed, not composed: it is the ticket's own `title`, and it matches the *User self-release* entry the backlog carried since Phase C. **`Invariants touched` is `[]` deliberately.** The seeded ticket claims `INV-01, INV-02, INV-03, INV-06`, transcribed from a row that did not exist, so that list has no source and is not carried here — a plausible invention is more expensive to find than an obvious gap. SPEC determines the real set and this row is amended then. The 🟡 stands until a human confirms the scope: self-release and the request workflow may be one feature or two, and REG-01 covering both is an assumption nobody has stated. |

## DSH — Dashboard

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|

## SYS — System

| ID | Status | Title | Description | Group | Invariants touched | Notes |
|----|--------|-------|-------------|-------|--------------------|-------|
| SYS-02 | PLANNED | Cutover to Supabase as the data client | The application reads and writes a real Postgres database through Supabase instead of in-memory fixtures. Prisma leaves the project; `src/lib/data/prisma/` is replaced module-for-module by a `supabase/` sibling under `src/lib/data/`, against the same DTOs, and `DATA_SOURCE` defaults to the real database. | SYS | INV-04, INV-05, INV-06 | Implements ADR-007, whose five open questions were **all answered by 2026-08-26** — the last four after review with a technical lead, recorded in the ADR beside their original recommendations. **`schema_delta` is NOT `none` and that is expected here**: the first migration creates the schema, adds `Account.auth_user_id`, and carries three constraints together — INV-04 as a partial unique index, INV-05 as a `DEFERRABLE INITIALLY IMMEDIATE` constraint trigger on `Device`, INV-06 as the downgrade trigger on `Seat` that closes INV-05's other side. RULE-09 puts one human signature on that migration and it is the only stop in the ticket. **INV-10 is deliberately out** — still a sketch needing `btree_gist` and a generated column, left at the seam and carried as debt. **Not to be split into two tickets:** check D12 is red from the first commit until it is rewritten as a two-package map, and splitting would place a red pull request in the middle on purpose; MD-16's ten failing tests are cleared in the same ticket, which is what MD-16 asked for. `allowed_paths` must include `src/lib/auth/supabase.ts` — ADR-007 reverses the comment block in it, and RULE-03 would otherwise refuse the one edit that has to happen. Preconditions before SPEC: credentials present on the machine, two Supabase projects (`dev` and `prod`), and `SUPABASE_SERVICE_ROLE_KEY` in `.env.example`. |
| SYS-01 | DONE | Replace Better Auth with Supabase Auth | The authentication provider is Supabase Auth, constructed server-side only. Better Auth is removed entirely. | SYS | INV-08 | Implements ADR-006. Merged as PR #32 and #33 on 2026-08-25. Removes the `better-auth` dependency, the server instance, the browser client and the catch-all route handler; adopts `@supabase/ssr` exempted in `no-restricted-imports` for `src/lib/auth/**` alone. `src/lib/auth/permissions.ts` is unchanged — it never depended on Better Auth. `schema_delta` stayed `none`: `Member.authUserId` is not needed while `DATA_SOURCE=mock`, and pulling it in would have put a RULE-09 human gate in the middle of the loop. INV-08 is on this row because self-signup moved from `disableSignUp: true` to the client-side flag ADR-006 records — **read MD-14 before assuming that flag enforces anything.** It delivered no sign-in surface; see the AUT table. |
| | TRIAGE | Supabase data client replaces Prisma | The implementation behind `src/lib/data/` becomes `@supabase/supabase-js`, server-side only. Prisma leaves the tree. The seam itself does not move. | SYS | [] | **Implements ADR-007 clauses 1 to 6 and 8.** `schema_delta` stays `none` and `DATA_SOURCE` keeps defaulting to `mock`, which keeps the RULE-09 schema approval at a ticket boundary instead of the middle of a loop — the cutover is the row below. Includes the D12 rewrite clause 8 requires **and MD-16's ten tests with it**, which is the argument for doing this before another feature slice: CI runs `docs-audit` then `hook guards` as sequential steps, so while `hook guards` is red `pnpm verify` is skipped and typecheck, lint, unit and e2e do not run at all. ADR-007's OQ-1 and OQ-2 are answered at DESIGN. |
| | TRIAGE | Cut over from mock fixtures to the hosted database | The application runs against the real Supabase Postgres rather than mock fixtures, and the seed data lands in it. | SYS | INV-04, INV-05, INV-07, INV-10 | **Implements ADR-007 clause 7.** The first SQL migration, collapsing `prisma/schema.prisma` and `prisma/constraints.draft.sql` into one artefact in the language INV-04's partial index and INV-05's constraint trigger always required. **`schema_delta` is not `none`, so this needs a human ADR-linked approval under RULE-09 before Definition of Ready passes.** `DATA_SOURCE` becomes `"mock" \| "supabase"` defaulting to `"supabase"`; `src/app/page.tsx` renders that string under `data-testid="home-data-source"`, so any e2e assertion on `prisma` breaks. Preconditions from ADR-007 OQ-4, which the operator answered on 2026-08-25 — the project exists; what is still unrecorded is which credentials are on which machine, and whether one project serves every environment. ADR-007's OQ-3 and OQ-5 are answered at DESIGN. |
