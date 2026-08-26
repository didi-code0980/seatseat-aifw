---
ticket: GRP-02
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-26T04:28:20Z
inputs_read: [ .ai/board/tickets/GRP-02/01-story.md, .ai/board/tickets/GRP-02/02-design.md, .ai/board/tickets/GRP-02/03-impl-log.md, .ai/board/tickets/GRP-02/ticket.yaml, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/01-operating-model.md, .ai/templates/review-report.md, .ai/steward/context.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# GRP-02 — Member assignment to groups — review report

Nine checks, nine citations, no findings. The verdict is `PASS` and the ticket advances to QA.

This session was fresh, read files only, and had no message channel to the Developer or to any other agent (RULE-13). `chat_before_verdict: none` is true as written.

Verification was conducted by execution against the codebase and static code inspection:
- R1 (`scripts/check-allowed-paths.mjs`), R2 (`pnpm typecheck`), R3 (`pnpm lint`), unit tests (`pnpm test`), and e2e regression tests (`pnpm exec playwright test tests/e2e/members.spec.ts`) executed and exited 0.
- Every contract signature, validation schema, server action, testid, and permission comment verified against design sections 1, 2, 5, and 6.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Eight source files modified, all enumerated in `ticket.yaml:allowed_paths`. `node scripts/check-allowed-paths.mjs` exits `0` (`PASS`) — *R1 detail* |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` (`tsc --noEmit`), exit `0`, 0 diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` (`eslint .`), exit `0`, 0 errors (3 pre-existing warnings in unrelated test files) |
| R4 | No component imports a database client or reaches the database directly (RULE-02) | **PASS** | `src/app/(app)/members/page.tsx:4` imports `{ accounts, groups, members, seats }` from `@/lib/data`. No component or action imports `@/lib/data/prisma/**` or reaches the database directly |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | All contract items in §1.1–§1.7 implemented — table in *R5 detail* |
| R6 | Permission gating matches design section 2 | **PASS** | `src/actions/members.ts:203-207` carries step-3 permission comment noting lack of active auth session and open `Q-2`. No `PermissionGate` or fake role bypass in UI (`src/app/(app)/members/members-manager.tsx`) — *R6 detail* |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | All 9 selectors from design §6 verified in markup — table in *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | `invariants_touched: []`. Member assignment writes scalar `Member.groupId` and deletes no member (INV-12 unengaged). `mock/members.ts` imports no `rooms` and touches no seats/devices/occupancies (AC-11) — *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `package.json` unmodified vs `origin/main` (`git diff origin/main package.json` is empty). All imports use existing dependencies |

## R1 detail

The working tree changes attributable to ticket GRP-02 are an exact subset of `allowed_paths`:

| Path | State | `allowed_paths` entry |
|---|---|---|
| `src/lib/data/types.ts` | modified | `src/lib/data/types.ts` |
| `src/lib/data/mock/members.ts` | modified | `src/lib/data/mock/members.ts` |
| `src/lib/data/prisma/members.ts` | modified | `src/lib/data/prisma/members.ts` |
| `src/lib/validation/member.ts` | modified | `src/lib/validation/member.ts` |
| `src/actions/members.ts` | modified | `src/actions/members.ts` |
| `src/actions/groups.ts` | modified | `src/actions/groups.ts` |
| `src/app/(app)/members/page.tsx` | modified | `src/app/(app)/members/page.tsx` |
| `src/app/(app)/members/members-manager.tsx` | modified | `src/app/(app)/members/members-manager.tsx` |
| `.ai/board/tickets/GRP-02/ticket.yaml` | modified | `.ai/board/tickets/GRP-02/**` |
| `.ai/board/tickets/GRP-02/03-impl-log.md` | created | `.ai/board/tickets/GRP-02/**` |

The remaining two paths in `allowed_paths` (`tests/unit/member-groups.test.ts` and `tests/e2e/member-groups.spec.ts`) belong to QA (RULE-05) and are not created at this stage.

## R5 detail

Contract items from design section 1 and seam impact from section 3.

### 1.1 — Seam DTO (`src/lib/data/types.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `AssignMemberToGroupOutcome` (`{ assigned: true; member: Member; previousGroupId: string \| null } \| { assigned: false; reason: "MEMBER_NOT_FOUND" \| "GROUP_NOT_FOUND" }`) | `src/lib/data/types.ts:226-228` | Yes |
| `Member`, `NewMember`, `MemberPatch` untouched | `src/lib/data/types.ts:167-195` | Yes (additive only) |

### 1.2 — Seam functions (`src/lib/data/mock/members.ts` & `src/lib/data/prisma/members.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `assignMemberToGroup(memberId: string, groupId: string): Promise<AssignMemberToGroupOutcome>` (mock) | `src/lib/data/mock/members.ts:128-142` | Yes |
| `assignMemberToGroup(memberId: string, groupId: string): Promise<AssignMemberToGroupOutcome>` (prisma stub) | `src/lib/data/prisma/members.ts:38-45` | Yes |
| Mock rule 1 — checks before first write | `src/lib/data/mock/members.ts:132-137` | Yes |
| Mock rule 2 — `MEMBER_NOT_FOUND` checked before `GROUP_NOT_FOUND` | `src/lib/data/mock/members.ts:133, 136` | Yes |
| Mock rule 3 — `GROUP_NOT_FOUND` evaluated against stored `groups` | `src/lib/data/mock/members.ts:135-137` | Yes |
| Mock rule 4 — Exactly one field written on one row (`member.groupId = groupId`) | `src/lib/data/mock/members.ts:140` | Yes |
| Mock rule 5 — `groups` imported from `./store` as array | `src/lib/data/mock/members.ts:25` | Yes |
| Prisma parity stubs with parameters discarded via `void` | `src/lib/data/prisma/members.ts:42-43` | Yes |

### 1.3 — Validation schemas (`src/lib/validation/member.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `memberGroupIdSchema` (`z.string().trim().min(1, "A group is required.")`) | `src/lib/validation/member.ts:75` | Yes |
| `assignMemberToGroupSchema` (`z.object({ id: memberIdSchema, groupId: memberGroupIdSchema })`) | `src/lib/validation/member.ts:78-81` | Yes |
| `AssignMemberToGroupInput` | `src/lib/validation/member.ts:85` | Yes |

### 1.4 — Server action (`src/actions/members.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `MemberFieldName` gains `"groupId"` | `src/actions/members.ts:44` | Yes |
| `MEMBER_FIELD_NAMES` gains `"groupId"` | `src/actions/members.ts:72` | Yes |
| `MemberActionError` gains `GROUP_NOT_FOUND` arm (`{ kind: "GROUP_NOT_FOUND"; fields: { groupId: string } }`) | `src/actions/members.ts:60` | Yes |
| `GROUP_GONE_MESSAGE = "That group no longer exists."` | `src/actions/members.ts:70` | Yes |
| `assignMemberToGroup(input: unknown): Promise<MemberActionResult<Member>>` | `src/actions/members.ts:197-223` | Yes |
| Step 2 — Zod parsing with `unknown` input, returns `VALIDATION` error | `src/actions/members.ts:200-201` | Yes |
| Step 3 — Permission comment at line | `src/actions/members.ts:203-207` | Yes |
| Step 4 — Seam call and outcome mapping | `src/actions/members.ts:208-215` | Yes |
| Step 5 — `revalidatePath("/members")` on write | `src/actions/members.ts:221` | Yes |

### 1.5 — Server action updates in `src/actions/groups.ts`

| Contract item | Implemented at | Matches |
|---|---|---|
| Head comment replaced naming GRP-02 and keeping F-3 reasons | `src/actions/groups.ts:16-39` | Yes |
| `createGroup` revalidates `/members` | `src/actions/groups.ts:178` | Yes |
| `updateGroup` revalidates `/members` | `src/actions/groups.ts:214` | Yes |
| `deleteGroup` revalidates `/members` | `src/actions/groups.ts:267` | Yes |

### 1.6 — UI Server Component (`src/app/(app)/members/page.tsx`)

| Contract item | Implemented at | Matches |
|---|---|---|
| `MemberRow` interface gains `groupName: string \| null` | `src/app/(app)/members/page.tsx:36` | Yes |
| `GroupOption` interface (`{ id: string; path: string }`) | `src/app/(app)/members/page.tsx:40-47` | Yes |
| Fourth seam read `groups.listGroups()` in `Promise.all` | `src/app/(app)/members/page.tsx:82` | Yes |
| `groupName` composed via `Map<id, name>` with `?? null` | `src/app/(app)/members/page.tsx:99, 107` | Yes |
| `groupOptions` composed via pre-order downward walk with `localeCompare` | `src/app/(app)/members/page.tsx:127-148` | Yes |
| Pass `rows` and `groupOptions` to `MembersManager` | `src/app/(app)/members/page.tsx:153` | Yes |

### 1.7 — UI Client Component (`src/app/(app)/members/members-manager.tsx`)

| Contract item | Implemented at | Matches |
|---|---|---|
| Group column placed after Role and before Seats occupied, renders `groupName ?? NO_GROUP` | `src/app/(app)/members/members-manager.tsx:383-394` | Yes |
| `Assign group` button on every row unconditionally | `src/app/(app)/members/members-manager.tsx:446-455` | Yes |
| Assign dialog via `EntityFormDialog` with `testIdPrefix="member-assign"` | `src/app/(app)/members/members-manager.tsx:574-625` | Yes |
| Group select options render placeholder + group paths | `src/app/(app)/members/members-manager.tsx:584-609` | Yes |
| `member-assign-empty` message when no group exists | `src/app/(app)/members/members-manager.tsx:614-618` | Yes |
| `submitAssign` calling action and `router.refresh()` | `src/app/(app)/members/members-manager.tsx:203-221` | Yes |

### 3 — Seam impact

| Contract item | Implemented at | Matches |
|---|---|---|
| `mock/members.ts` imports `groups` from `./store` | `src/lib/data/mock/members.ts:25` | Yes |
| `mock/members.ts` does not import `rooms` or mutate `groups` | `src/lib/data/mock/members.ts:25, 128-142` | Yes |

## R6 detail

| Design section 2 requirement | Verdict | Citation |
|---|---|---|
| Step 3 comments specifying permission model status and open `Q-2` | Holds | `src/actions/members.ts:203-207` |
| No `PermissionGate` imported or used | Holds | `src/app/(app)/members/members-manager.tsx` (not imported) |
| No fake role comparison or auth bypass | Holds | `src/actions/members.ts` and `src/app/(app)/members/members-manager.tsx` |
| Row controls rendered unconditionally | Holds | `src/app/(app)/members/members-manager.tsx:446-455` |

## R7 detail

All 9 `data-testid` selectors from design section 6 verified in markup:

| `data-testid` | Location |
|---|---|
| `members-row-<email>-group` | `src/app/(app)/members/members-manager.tsx:390` |
| `members-row-<email>-assign` | `src/app/(app)/members/members-manager.tsx:452` |
| `member-assign-dialog` | `src/app/(app)/members/members-manager.tsx:580` via `EntityFormDialog testIdPrefix="member-assign"` |
| `member-assign-group` | `src/app/(app)/members/members-manager.tsx:591` |
| `member-assign-group-error` | `src/app/(app)/members/members-manager.tsx:608` |
| `member-assign-empty` | `src/app/(app)/members/members-manager.tsx:615` |
| `member-assign-submit` | `src/app/(app)/members/members-manager.tsx:580` via `EntityFormDialog testIdPrefix="member-assign"` |
| `member-assign-cancel` | `src/app/(app)/members/members-manager.tsx:580` via `EntityFormDialog testIdPrefix="member-assign"` |
| `member-assign-error` | `src/app/(app)/members/members-manager.tsx:621` |

## R8 detail

`ticket.yaml:invariants_touched` is `[]` (considered, none engaged).

| Invariant | Held by | Citation |
|---|---|---|
| **INV-12** (member deletion refused if occupied/owned) | Not engaged. `assignMemberToGroup` updates only scalar `member.groupId` and deletes no member. `AssignMemberToGroupOutcome` contains no delete arm. | `src/lib/data/mock/members.ts:139-141`, `src/lib/data/types.ts:226-228` |
| **AC-11** (no seats/devices/rooms/occupancy touched) | Held structurally: `src/lib/data/mock/members.ts` imports only `devices`, `groups`, `members`, and `seats` from `./store` (`rooms` is not imported); `assignMemberToGroup` mutates only `member.groupId`. | `src/lib/data/mock/members.ts:25, 140` |

## Findings

None. No check failed; no rework required.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | — | — | — |

## Verdict

**`PASS`**. All nine review checks (R1–R9) pass. The ticket advances to `QA`.
