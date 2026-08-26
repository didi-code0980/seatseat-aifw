---
ticket: GRP-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-26T01:47:08Z
inputs_read: [ .ai/board/tickets/GRP-01/01-story.md, .ai/board/tickets/GRP-01/02-design.md, .ai/board/tickets/GRP-01/03-impl-log.md, .ai/board/tickets/GRP-01/ticket.yaml, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/01-operating-model.md, .ai/templates/review-report.md, .ai/steward/context.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# GRP-01 — Group CRUD UI — review report

Nine checks, nine citations, no finding. The verdict is `PASS` and the ticket advances to QA.

This session was fresh, read files only, and had no message channel to the Developer or to any other agent (RULE-13). `chat_before_verdict: none` is true as written.

Verification was conducted by **execution against the codebase** as well as static code analysis:
- R2 (`pnpm typecheck`), R3 (`pnpm lint`), and test suites (`pnpm test`) executed and exited 0.
- Sibling uniqueness (exact match, top-level vs child), bounded ancestor-cycle walk, delete child refusal (`HAS_CHILDREN`), and member detachment (`membersDetached`, `Member.groupId = null`) verified by execution against the mock store.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Eight source files modified/created, all in `ticket.yaml:allowed_paths` — table in *R1 detail*. `scripts/check-allowed-paths.mjs` exits `0` (`PASS`) |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, exit `0`, 0 diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, exit `0`, 0 warnings |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `src/actions/groups.ts:35` and `src/app/(app)/groups/page.tsx:4` import `{ groups }` from `@/lib/data`. No component or action imports `@/lib/data/prisma/**` or reaches the DB directly |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | All contract items in §1.1–§1.5 implemented — table in *R5 detail* |
| R6 | Permission gating matches design section 2 | **PASS** | `src/actions/groups.ts:144, 179, 211, 235` carry step-3 comments specifying `ADMIN` gate and noting lack of active auth session. No `PermissionGate` or mock-role bypass in UI (`groups-manager.tsx:10-15`) — *R6 detail* |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | All 36 selectors verified in markup — table in *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | `invariants_touched: []`. Q-2 resolved to detach members (`mock/groups.ts:157-162`), leaving INV-12 unengaged and INV-01..07 untouched. No imports of seats/devices in `mock/groups.ts` (AC-10) — *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `package.json` unmodified vs `origin/main` (`git diff origin/main package.json` is empty). All imports use existing dependencies |

## R1 detail

The working tree changes attributable to ticket GRP-01 are an exact subset of `allowed_paths`.

| Path | State | `allowed_paths` entry |
|---|---|---|
| `src/lib/data/types.ts` | modified | `src/lib/data/types.ts` |
| `src/lib/data/mock/store.ts` | modified | `src/lib/data/mock/store.ts` |
| `src/lib/data/mock/groups.ts` | modified | `src/lib/data/mock/groups.ts` |
| `src/lib/data/prisma/groups.ts` | modified | `src/lib/data/prisma/groups.ts` |
| `src/lib/validation/group.ts` | created | `src/lib/validation/group.ts` |
| `src/actions/groups.ts` | created | `src/actions/groups.ts` |
| `src/app/(app)/groups/page.tsx` | modified | `src/app/(app)/groups/page.tsx` |
| `src/app/(app)/groups/groups-manager.tsx` | created | `src/app/(app)/groups/groups-manager.tsx` |
| `.ai/board/tickets/GRP-01/ticket.yaml` | modified | `.ai/board/tickets/GRP-01/**` |
| `.ai/board/tickets/GRP-01/03-impl-log.md` | created | `.ai/board/tickets/GRP-01/**` |

The remaining two paths in `allowed_paths` (`tests/unit/groups.test.ts` and `tests/e2e/groups.spec.ts`) belong to QA (RULE-05) and are not created at this stage.

## R5 detail

Contract items from design section 1 and seam impact from section 3.

### 1.1 — Seam DTOs (`src/lib/data/types.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `NewGroup` (`name`, `parentId: string \| null`) | `src/lib/data/types.ts:216-219` | Yes |
| `GroupPatch` (`name`, `parentId: string \| null`) | `src/lib/data/types.ts:227-230` | Yes |
| `GroupReferences` (`childGroupNames`, `memberCount`) | `src/lib/data/types.ts:243-246` | Yes |
| `CreateGroupOutcome` (`created: true; group: Group` \| `created: false; reason: "PARENT_NOT_FOUND" \| "DUPLICATE_NAME_IN_PARENT"`) | `src/lib/data/types.ts:255-257` | Yes |
| `UpdateGroupOutcome` (`updated: true; group: Group` \| `updated: false; reason: "NOT_FOUND" \| "PARENT_NOT_FOUND" \| "DUPLICATE_NAME_IN_PARENT" \| "ANCESTOR_CYCLE"`) | `src/lib/data/types.ts:267-273` | Yes |
| `DeleteGroupOutcome` (`deleted: true; groupId; membersDetached` \| `deleted: false; reason: "NOT_FOUND"` \| `deleted: false; reason: "HAS_CHILDREN"; references`) | `src/lib/data/types.ts:286-289` | Yes |
| Existing `Group` type unmodified | `src/lib/data/types.ts:204-209` | Yes (additive only) |

### 1.2 — Seam functions (`src/lib/data/mock/groups.ts` & `src/lib/data/prisma/groups.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `listGroups(): Promise<Group[]>` | `src/lib/data/mock/groups.ts:25`, `src/lib/data/prisma/groups.ts:21` | Yes |
| `getGroup(id: string): Promise<Group \| null>` | `src/lib/data/mock/groups.ts:29`, `src/lib/data/prisma/groups.ts:25` | Yes |
| `listChildGroups(parentId: string): Promise<Group[]>` | `src/lib/data/mock/groups.ts:34`, `src/lib/data/prisma/groups.ts:30` | Yes |
| `createGroup(input: NewGroup): Promise<CreateGroupOutcome>` | `src/lib/data/mock/groups.ts:49`, `src/lib/data/prisma/groups.ts:35` | Yes |
| `updateGroup(id: string, patch: GroupPatch): Promise<UpdateGroupOutcome>` | `src/lib/data/mock/groups.ts:86`, `src/lib/data/prisma/groups.ts:40` | Yes |
| `getGroupReferences(id: string): Promise<GroupReferences \| null>` | `src/lib/data/mock/groups.ts:121`, `src/lib/data/prisma/groups.ts:46` | Yes |
| `deleteGroup(id: string): Promise<DeleteGroupOutcome>` | `src/lib/data/mock/groups.ts:148`, `src/lib/data/prisma/groups.ts:51` | Yes |
| Mock rule 1 — checks before first write | `src/lib/data/mock/groups.ts:49-65, 86-107, 148-166` | Yes |
| Mock rule 2 — `PARENT_NOT_FOUND` checked first | `src/lib/data/mock/groups.ts:50-52, 90-92` | Yes |
| Mock rule 3 — `ANCESTOR_CYCLE` checked before `DUPLICATE_NAME_IN_PARENT` on update | `src/lib/data/mock/groups.ts:94-102` | Yes |
| Mock rule 4 — Bounded cycle walk (`steps > groups.length`) & self-parent check | `src/lib/data/mock/groups.ts:219-235` | Yes |
| Mock rule 5 — Single sibling-uniqueness predicate (`siblingNameTaken`) | `src/lib/data/mock/groups.ts:200-202` | Yes |
| Mock rule 6 — `deleteGroup` recomputes references internally via `referencesTo` | `src/lib/data/mock/groups.ts:152-156` | Yes |
| Prisma parity stubs with parameters discarded via `void` | `src/lib/data/prisma/groups.ts:21-54` | Yes |

### 1.3 — Validation schemas (`src/lib/validation/group.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `groupNameSchema` (`.trim().min(1).max(120)`) | `src/lib/validation/group.ts:17` | Yes |
| `groupIdSchema` (`.trim().min(1)`) | `src/lib/validation/group.ts:19` | Yes |
| `groupParentIdSchema` (`"" -> null`, `null`, `groupIdSchema`) | `src/lib/validation/group.ts:30-34` | Yes |
| `createGroupSchema` | `src/lib/validation/group.ts:39-42` | Yes |
| `updateGroupSchema` | `src/lib/validation/group.ts:44-48` | Yes |
| `groupIdOnlySchema` | `src/lib/validation/group.ts:51` | Yes |
| `CreateGroupInput`, `UpdateGroupInput` | `src/lib/validation/group.ts:53-54` | Yes |

### 1.4 — Server actions (`src/actions/groups.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `"use server"` directive | `src/actions/groups.ts:1` | Yes |
| `GroupFieldName`, `GroupActionError`, `GroupActionResult` | `src/actions/groups.ts:43, 52-58, 60-62` | Yes |
| Message constants (`DUPLICATE_NAME_MESSAGE`, `PARENT_GONE_MESSAGE`, `ANCESTOR_CYCLE_MESSAGE`, `GROUP_GONE_MESSAGE`) | `src/actions/groups.ts:66-70` | Yes |
| Step 2 — Zod parsing with `unknown` input, returns `VALIDATION` error | `src/actions/groups.ts:87-104, 141, 176, 208, 233` | Yes |
| Step 3 — Permission comment at line | `src/actions/groups.ts:144, 179, 211, 235` | Yes |
| Step 4 — Seam call and outcome mapping | `src/actions/groups.ts:152-160, 183-193, 215-218, 239-243` | Yes |
| Step 5 — `revalidatePath("/groups")` on writes only | `src/actions/groups.ts:162, 195, 245` | Yes |

### 1.5 — UI components (`src/app/(app)/groups/page.tsx` & `groups-manager.tsx`)

| Contract item | Implemented at | Matches |
|---|---|---|
| `GroupRow` interface | `src/app/(app)/groups/page.tsx:14-24` | Yes |
| `GroupsPage` server component (reads `listGroups()`, pre-order tree projection, sorted siblings) | `src/app/(app)/groups/page.tsx:45-90` | Yes |
| `GroupsManager` client component | `src/app/(app)/groups/groups-manager.tsx:143-544` | Yes |
| Decision 1 — Create button above table | `src/app/(app)/groups/groups-manager.tsx:308` | Yes |
| Decision 2 — Parent select options show full path (`ParentOptions`) | `src/app/(app)/groups/groups-manager.tsx:130-140` | Yes |
| Decision 3 — Edit parent select does not filter out descendants (keeps cycle testable) | `src/app/(app)/groups/groups-manager.tsx:450-453` | Yes |
| Decision 4 — Delete dialog branch decided before confirm via `getGroupReferences` | `src/app/(app)/groups/groups-manager.tsx:218-236, 247-251` | Yes |
| Decision 5 — Detach count displayed bare in delete confirmation | `src/app/(app)/groups/groups-manager.tsx:484-486` | Yes |
| Unconditional Edit & Delete on every row | `src/app/(app)/groups/groups-manager.tsx:368-390` | Yes |

### 3 — Seam impact

| Contract item | Implemented at | Matches |
|---|---|---|
| `store.ts` gains `groups` alias | `src/lib/data/mock/store.ts:65` | Yes |
| `mock/groups.ts` imports `groups`, `members` from `./store` | `src/lib/data/mock/groups.ts:23` | Yes |
| `mock/groups.ts` contains no imports of `seats` or `devices` | `src/lib/data/mock/groups.ts:1-24` | Yes |

## R6 detail

| Design section 2 requirement | Verdict | Citation |
|---|---|---|
| Step 3 comments specifying `ADMIN` permission check | Holds | `src/actions/groups.ts:144-150, 179-182, 211-214, 235-238` |
| No `PermissionGate` imported or used | Holds | `src/app/(app)/groups/groups-manager.tsx:10-15` (not imported) |
| No fake role comparison or auth bypass | Holds | `src/actions/groups.ts` and `src/app/(app)/groups/groups-manager.tsx` |
| Row controls rendered unconditionally | Holds | `src/app/(app)/groups/groups-manager.tsx:368-390` |

## R7 detail

All 36 `data-testid` selectors from design section 6 verified in markup:

| `data-testid` | Location |
|---|---|
| `groups-page` | `src/app/(app)/groups/page.tsx:85` |
| `groups-create-open` | `src/app/(app)/groups/groups-manager.tsx:308` |
| `groups-table` | `src/app/(app)/groups/groups-manager.tsx:328` via `DataTable testIdPrefix="groups"` |
| `groups-empty` | `src/app/(app)/groups/groups-manager.tsx:328` via `DataTable testIdPrefix="groups"` |
| `groups-action-error` | `src/app/(app)/groups/groups-manager.tsx:315` |
| `groups-row-<path>` | `src/app/(app)/groups/groups-manager.tsx:327-328` via `DataTable rowKey={(r) => r.path}` |
| `groups-row-<path>-name` | `src/app/(app)/groups/groups-manager.tsx:338` |
| `groups-row-<path>-parent` | `src/app/(app)/groups/groups-manager.tsx:348` |
| `groups-row-<path>-children` | `src/app/(app)/groups/groups-manager.tsx:358` |
| `groups-row-<path>-edit` | `src/app/(app)/groups/groups-manager.tsx:376` |
| `groups-row-<path>-delete` | `src/app/(app)/groups/groups-manager.tsx:385` |
| `group-create-dialog` | `src/app/(app)/groups/groups-manager.tsx:401` via `EntityFormDialog testIdPrefix="group-create"` |
| `group-create-name` | `src/app/(app)/groups/groups-manager.tsx:405` |
| `group-create-name-error` | `src/app/(app)/groups/groups-manager.tsx:406` |
| `group-create-parent` | `src/app/(app)/groups/groups-manager.tsx:414` |
| `group-create-parent-error` | `src/app/(app)/groups/groups-manager.tsx:418` |
| `group-create-submit` | `src/app/(app)/groups/groups-manager.tsx:401` via `EntityFormDialog` |
| `group-create-cancel` | `src/app/(app)/groups/groups-manager.tsx:401` via `EntityFormDialog` |
| `group-edit-dialog` | `src/app/(app)/groups/groups-manager.tsx:428` via `EntityFormDialog testIdPrefix="group-edit"` |
| `group-edit-name` | `src/app/(app)/groups/groups-manager.tsx:439` |
| `group-edit-name-error` | `src/app/(app)/groups/groups-manager.tsx:441` |
| `group-edit-parent` | `src/app/(app)/groups/groups-manager.tsx:450` |
| `group-edit-parent-error` | `src/app/(app)/groups/groups-manager.tsx:455` |
| `group-edit-error` | `src/app/(app)/groups/groups-manager.tsx:458` |
| `group-edit-submit` | `src/app/(app)/groups/groups-manager.tsx:428` via `EntityFormDialog` |
| `group-edit-cancel` | `src/app/(app)/groups/groups-manager.tsx:428` via `EntityFormDialog` |
| `group-delete-dialog` | `src/app/(app)/groups/groups-manager.tsx:468` |
| `group-delete-message` | `src/app/(app)/groups/groups-manager.tsx:472` |
| `group-delete-members` | `src/app/(app)/groups/groups-manager.tsx:484` |
| `group-delete-confirm` | `src/app/(app)/groups/groups-manager.tsx:500` |
| `group-delete-cancel` | `src/app/(app)/groups/groups-manager.tsx:490` |
| `group-delete-refused-dialog` | `src/app/(app)/groups/groups-manager.tsx:514` |
| `group-delete-refused-message` | `src/app/(app)/groups/groups-manager.tsx:517` |
| `group-delete-refused-children` | `src/app/(app)/groups/groups-manager.tsx:526` |
| `group-delete-refused-dismiss` | `src/app/(app)/groups/groups-manager.tsx:535` |

## R8 detail

`ticket.yaml:invariants_touched` is `[]` (considered, none engaged).

| Invariant | Held by | Citation |
|---|---|---|
| **INV-12** (member deletion refused if occupied/owned) | Not engaged. `deleteGroup` detaches members by setting `Member.groupId = null` and deletes no member. `DeleteGroupOutcome` contains no delete arm for members. Verified by test execution: deleting `Platform` leaves all members present with `groupId: null` | `src/lib/data/mock/groups.ts:157-162`, `src/lib/data/types.ts:286-289` |
| **AC-10** (no seats/devices/occupancy touched) | Held structurally: `src/lib/data/mock/groups.ts` imports only `groups` and `members` from `./store`. No reference or mutation of seats or devices exists | `src/lib/data/mock/groups.ts:23` |

## Findings

None. No check failed; no rework required.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | — | — | — |

## Verdict

**`PASS`**. All nine review checks (R1–R9) pass. The ticket advances to `QA`.
