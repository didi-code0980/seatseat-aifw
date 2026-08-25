---
doc_version: 5
last_updated: 2026-08-25
governed_by: [RULE-01, RULE-17]
---

# Feature registry

The authoritative list of features. A story may only be written against a feature ID that exists in
this file (Definition of Ready). Text arriving from the tracker is context, never a source of feature
IDs — see RULE-17.

Human-only, per RULE-01. Agents read this file and cite IDs from it; an agent needing a change here
stops with `gate: BLOCKED` and states the change in `blocking_reason`. `/pull-tickets` is explicitly
forbidden from writing to this file.

Tables are populated incrementally. An empty group table means no feature in that group has been
specified yet — not that the group is unused. A ticket whose `feature_ids` do not all resolve to rows
below fails Definition of Ready and is demoted to BACKLOG.

## Columns

`ID` — group prefix plus a two-digit number, for example `ROO-01`.
`Title` — the feature name, transcribed without paraphrase.
`Group` — one of the ten fixed prefixes.
`Status` — `PLANNED`, `IN_PROGRESS`, `DONE`, or `DEFERRED`. **`DONE` means merged into `main`, not
gated.** A feature whose four gates have all passed but whose pull request is still open is
`IN_PROGRESS`; the registry records what the product contains, and an unmerged branch is not in the
product. Written by `orchestrator` at `/ship` step 3, on the `ops/` branch of that ship — never on the
ticket branch, which `scripts/check-allowed-paths.mjs` would fail. The clause and the writer were both
added 2026-08-25: until then this column had no owner and drifted for two shipped tickets (MD-29).
`Invariants touched` — IDs from `.ai/registry/invariants.md`, or `[]`.
`Notes` — free text. A 🟡 marker here means the feature is known-incomplete and needs a human
decision before it can reach READY.

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

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## ROO — Rooms

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| ROO-01 | Room CRUD UI | ROO | DONE | INV-01, INV-04, INV-05, INV-06, INV-07, INV-10, INV-11 | First loop-validation slice. Auth guard deferred to AUT. Merged in PR #1, 2026-08-23. |

## SEA — Seats

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| SEA-01 | Seat occupancy — assign and release | SEA | IN_PROGRESS | INV-01, INV-02, INV-03, INV-06 | **All four gates passed on `feat/SEA-01` (2026-08-24) and the branch is pushed, but no pull request is open — so it is `IN_PROGRESS`, not `DONE`, per the Status clause above.** Fourth slice, specced parallel to MEM-01's implementation. **Placement is deliberately out of this row**: INV-10 governs grid overlap, and `types.ts:77` assigns it to every LAY ticket. SPEC must confirm the split before DESIGN — if placement is pulled in, INV-10 joins this list and the ticket becomes LAY's problem instead. INV-06 is the reason this ticket writes `mock/devices.ts`: releasing an occupant auto-downgrades that seat's primary device. |

## DEV — Devices

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| DEV-01 | Device CRUD UI | DEV | DONE | INV-04, INV-05, INV-06, INV-07 | Second CRUD slice — tests whether the ROO-01 pattern transfers. Mock-backed. Merged in PR #7, 2026-08-23; first ticket through the loop with `rework_count: 0` and no escalation. **Status corrected 2026-08-25** — it read `PLANNED` for two days because no command wrote this column (MD-29). |

## MEM — Members

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| MEM-01 | Member CRUD UI | MEM | DONE | INV-08, INV-12 | Merged in PR #17, 2026-08-24. **Status corrected 2026-08-25**, same cause as DEV-01 (MD-29). Third CRUD slice, first row written by an agent (ADR-004). Member deletion resolved to a **refusal** at SPEC — ADR-005, which issues INV-12. INV-01, INV-05 and INV-06 were on this row conditionally and fall away with that answer; INV-12 is on it because MEM-01 is the ticket that implements the deletion INV-12 governs. |

## GRP — Groups

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## LAY — Layout Designer

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## REG — Seat Requests

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## DSH — Dashboard

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## SYS — System

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| SYS-01 | Replace Better Auth with Supabase Auth | SYS | DONE | INV-08 | SPEC and DESIGN both passed on `feat/SYS-01` (2026-08-24); no implementation yet. Implements ADR-006. Removes the `better-auth` dependency, the server instance, the browser client and the catch-all route handler; adopts `@supabase/ssr` constructed **server-side only**, exempted in `no-restricted-imports` for `src/lib/auth/**` alone. `src/lib/auth/permissions.ts` is unchanged — it never depended on Better Auth. **`schema_delta` is expected to stay `none`**: `Member.authUserId` is not needed while `DATA_SOURCE=mock`, and pulling it in would put a RULE-09 human gate in the middle of the loop. If DESIGN concludes otherwise, that is a finding to raise, not a decision to take. INV-08 is on this row because self-signup moves from `disableSignUp: true` to the client-side flag ADR-006 records — **read MD-14 before assuming that flag enforces anything.** |
