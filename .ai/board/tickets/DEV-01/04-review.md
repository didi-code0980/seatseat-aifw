---
ticket: DEV-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-23T07:50:28Z
inputs_read: [ .ai/board/tickets/DEV-01/01-story.md, .ai/board/tickets/DEV-01/02-design.md, .ai/board/tickets/DEV-01/03-impl-log.md, .ai/board/tickets/DEV-01/99-questions.md, .ai/board/tickets/DEV-01/ticket.yaml, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/registry/decisions/ADR-004-file-write-guards-removed.md, .ai/01-operating-model.md, .ai/templates/review-report.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# DEV-01 — Device CRUD UI — review report

Nine checks, nine citations, no finding. The verdict is `PASS` and the ticket advances to QA.

This session was fresh, read files only, and had no message channel to the Developer or to any other
agent (RULE-13). `chat_before_verdict: none` is true as written.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Eight paths attributable to this ticket, each matched to a `ticket.yaml:allowed_paths` entry — table below |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, exit `0`, no diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, exit `0`, no output |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `src/app/(app)/devices/page.tsx:4` imports `@/lib/data`; grep for `lib/data/prisma`, `@prisma/client`, `PrismaClient` across `src/app` and `src/components` returns nothing |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | 30 items, each cited in *R5 detail* |
| R6 | Permission gating matches design section 2 | **PASS** | `src/actions/devices.ts:129,160,191,208,230,264` — six absent checks, each commented; no `PermissionGate`, `can()` or `ROLE_RANK` call in any ticket file |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | 33 static + 11 row-scoped selectors, all located — table below |
| R8 | No invariant violated (RULE-07) | **PASS** | Four IDs reasoned individually in *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `git diff main -- package.json pnpm-lock.yaml` is empty; `git status --porcelain` reports both files clean |

## R1 detail

The working tree holds three bodies of work at once, which is the state
`.ai/01-operating-model.md` describes as normal — every stage leaves the tree dirty and `/ship`
classifies it. R1 is therefore read against the diff attributable to **this ticket**, and each of the
other files was opened and confirmed to carry none of it.

| Path in the diff | `allowed_paths` entry | Evidence it is this ticket's |
|---|---|---|
| `src/lib/data/types.ts` | `src/lib/data/types.ts` | Eight added types, `types.ts:130-208`; no existing type modified |
| `src/lib/data/mock/devices.ts` | `src/lib/data/mock/devices.ts` | Six write functions, `:42-219` |
| `src/lib/data/prisma/devices.ts` | `src/lib/data/prisma/devices.ts` | Six `notWired` stubs, `:32-65` |
| `src/lib/validation/device.ts` | `src/lib/validation/device.ts` | Schemas, `:22-62` |
| `src/actions/devices.ts` | `src/actions/devices.ts` | Six actions, `:125-276` |
| `src/app/(app)/devices/page.tsx` | `src/app/(app)/devices/page.tsx` | `DevicesPage`, `:45` |
| `src/app/(app)/devices/devices-manager.tsx` | `src/app/(app)/devices/devices-manager.tsx` | New file, `DevicesManager` at `:96` |
| `.ai/board/tickets/DEV-01/*` | `.ai/board/tickets/DEV-01/**` | `01-`, `02-`, `03-`, `99-`, `ticket.yaml` |

Nothing else. `tests/` is clean — `git status --porcelain tests/` is empty — which is correct: the
design assigns `tests/**` to QA (section 5) even though three test files sit in `allowed_paths`.

**The other two bodies of work, confirmed not to be this ticket's.** `git diff main -- .ai .claude
CLAUDE.md` grepped for every identifier this implementation introduces
(`designatePrimaryDevice`, `assignDeviceToSeat`, `unassignDevice`, `NewDevice`, `DevicePatch`,
`DeviceRow`, `devices-manager`) returns exactly one line: the `allowed_paths` entry inside
`.ai/board/tickets/DEV-01/ticket.yaml`, which is itself in `allowed_paths`. The rest divides into

- the ADR-004 steward change — `.ai/registry/rules.md` (RULE-01 at v2), `glossary.md`,
  `00-charter.md`, `ADR-000/001/003`, `ADR-004` itself, `.claude/settings.json` (three hooks
  unwired), `.claude/hooks/tests/settings-integrity.test.mjs`, `.ai/standards/architecture.md`,
  `.ai/steward/context.md`, `.ai/templates/idea.md`, `model-debt.md` (MD-10);
- board and orchestrator upkeep — `.ai/board/backlog.md`, `metrics.md`, the new
  `.ai/board/tickets/MEM-01/ticket.yaml`, and the `features.md` MEM-01 row;
- the `next dev` block re-added to `CLAUDE.md`, which that tool writes.

**What this PASS is worth, stated rather than assumed.** The session is on `ops/guards-removed`, not
on `feat/DEV-01` as `ticket.yaml:branch` records. Per ADR-004 `guard-allowed-paths.mjs` is unwired
(MD-10), and per MD-09 `scripts/check-allowed-paths.mjs` skips vacuously on any branch not named
`feat/<ID>`. Both conditions hold here, so **this reading of the diff is the only enforcement of
RULE-03 that ran on this ticket at all.** That is the accepted cost ADR-004 records, not a defect in
this implementation, and it is why R1 was verified path-by-path above rather than asserted.

## R5 detail

Design section 1, item by item. Every signature was compared against the design text, not summarised.

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 `NewDevice` | `src/lib/data/types.ts:130` | yes — `ownerId` non-nullable per F-3 |
| §1.1 `DevicePatch` | `src/lib/data/types.ts:148` | yes — no `seatId`, no `rank` |
| §1.1 `CreateDeviceOutcome` | `src/lib/data/types.ts:155` | yes |
| §1.1 `UpdateDeviceOutcome` | `src/lib/data/types.ts:164` | yes — three reason codes |
| §1.1 `AssignDeviceOutcome` | `src/lib/data/types.ts:172` | yes |
| §1.1 `UnassignDeviceOutcome` | `src/lib/data/types.ts:177` | yes |
| §1.1 `DesignatePrimaryOutcome` | `src/lib/data/types.ts:193` | yes — four reason codes, `demotedDeviceId` present |
| §1.1 `DeleteDeviceOutcome` | `src/lib/data/types.ts:207` | yes — `wasPrimaryOfSeatId` present |
| §1.2 `createDevice` | `mock/devices.ts:42`, `prisma/devices.ts:32` | yes |
| §1.2 `updateDevice` | `mock/devices.ts:75`, `prisma/devices.ts:37` | yes |
| §1.2 `assignDeviceToSeat` | `mock/devices.ts:111`, `prisma/devices.ts:43` | yes |
| §1.2 `unassignDevice` | `mock/devices.ts:136`, `prisma/devices.ts:52` | yes |
| §1.2 `designatePrimaryDevice` | `mock/devices.ts:166`, `prisma/devices.ts:57` | yes — device id only, no seat id |
| §1.2 `deleteDevice` | `mock/devices.ts:211`, `prisma/devices.ts:62` | yes |
| §1.2 rule 1 — duplicate refused, `id` minted, `seatId: null`, `rank: "SECONDARY"` | `mock/devices.ts:43-45,48,52,53` | yes — both literals written, not spread from `input` |
| §1.2 rule 2 — no `seatId`/`rank` write; duplicate against any *other* device; INV-05 refusal writes nothing | `mock/devices.ts:81,85-90,92-94` | yes — every check precedes the first write at `:92` |
| §1.2 rule 3 — assign forces SECONDARY, touches no other row | `mock/devices.ts:119-121` | yes — only `device` is mutated |
| §1.2 rule 4 — unassign clears `seatId`, forces SECONDARY unconditionally, keeps `ownerId` | `mock/devices.ts:140-142` | yes |
| §1.2 rule 5 — four refusals in the specified order | `mock/devices.ts:168,173,178,182` | yes — `NOT_FOUND`, `NOT_ASSIGNED`, `SEAT_HAS_NO_OCCUPANT`, `OWNER_IS_NOT_OCCUPANT` |
| §1.2 rule 6 — demote before promote, no await between | `mock/devices.ts:186-194` | yes — synchronous; incumbent search excludes the target at `:187` |
| §1.2 rule 7 — one row removed, `wasPrimaryOfSeatId` read first | `mock/devices.ts:215-216` | yes — `splice(...,1)` |
| §1.3 all nine schemas | `src/lib/validation/device.ts:22-58` | yes — verbatim from the design |
| §1.3 "no owner chosen" refused by `.min(1)` on `value=""` | `validation/device.ts:31`; placeholders at `devices-manager.tsx:465,519` | yes — no `required` attribute anywhere |
| §1.4 `DeviceActionError` / `DeviceActionResult` | `src/actions/devices.ts:42-50` | yes — `REFUSED`, not `INVARIANT` |
| §1.4 `createDevice` | `src/actions/devices.ts:125` | yes |
| §1.4 `updateDevice` | `src/actions/devices.ts:156` | yes |
| §1.4 `assignDevice` | `src/actions/devices.ts:187` | yes — action named `assignDevice`, seam named `assignDeviceToSeat` |
| §1.4 `unassignDevice` | `src/actions/devices.ts:204` | yes |
| §1.4 `designatePrimaryDevice` | `src/actions/devices.ts:224` | yes |
| §1.4 `deleteDevice` | `src/actions/devices.ts:260` | yes |
| §1.4 reason-to-error mapping, all seven rows | `src/actions/devices.ts:58-63,143,174,179,238,240,242,244,196` | yes — message strings compared literally against the design table |
| §1.4 five-step body, `revalidatePath("/devices")` last | `src/actions/devices.ts:147,182,199,214,248,271` | yes — on the success path of all six |
| §1.5 `DevicesPage`, four existing reads in one `Promise.all` | `src/app/(app)/devices/page.tsx:45-51` | yes — no new seam function |
| §1.5 `DeviceRow`, `MemberOption`, `SeatOption` | `page.tsx:14,24,29` | yes — declared where §1.5 places them |
| §1.5 `DevicesManager`, holds no copy of the list | `devices-manager.tsx:96-104` | yes — `rows` is a prop; every write ends in `router.refresh()` |
| §1.5 row-control table | `devices-manager.tsx:377,386-407,415-424,432` | yes — Assign only when `seatId === null`, Unassign only when not, **Make primary on every row** |

## R7 detail

All 44 selectors located. Three prefixes are satisfied by shared components rather than by literals,
which the design permits in terms (section 6): `DataTable` at `devices-manager.tsx:285` with
`testIdPrefix="devices"` (`:291`) and `rowKey` (`:290`) emits `devices-table`, `devices-empty` and
`devices-row-<assetTag>` from `DataTable.tsx:25,29,39`; `EntityFormDialog` at `:449`, `:482` and
`:539` emits the `-dialog`, `-cancel`, `-submit` triple from `EntityFormDialog.tsx:35,39,42`.

| Group | Citation |
|---|---|
| `devices-page` | `page.tsx:87` |
| `devices-table`, `devices-empty`, `devices-row-<assetTag>` | `devices-manager.tsx:285` via `DataTable.tsx:25,29,39` |
| row cells `-tag` `-model` `-owner` `-seat` `-rank` `-occupant` | `devices-manager.tsx:299,306,315,326,342,360` |
| row controls `-edit` `-assign` `-unassign` `-primary` `-delete` | `devices-manager.tsx:377,393,403,420,432` |
| `devices-create-open`, `devices-action-error` | `devices-manager.tsx:273,280` |
| `device-create-*` (6) | `devices-manager.tsx:449` (triple), `452,453,457,458,462,472` |
| `device-edit-*` (6) | `devices-manager.tsx:482` (triple), `493,495,504,506,517,528` |
| `device-assign-*` (3) | `devices-manager.tsx:539` (triple), `548,557` |
| `device-delete-*` (5) | `devices-manager.tsx:566,569,581,587,597` |

The three contractual literals are present as specified: `unowned` at `:317`, `unassigned` at `:328`,
`n/a` at `:344` and `:362`, `no occupant` at `:362`, and `none` at `:582`. The seat option label
`<SEAT-CODE> (<ROOM-CODE>) — <occupant>` is built at `devices-manager.tsx:93`.

## R8 detail

Reasoned per ID, against every write path in the repository rather than against the ticket's own
description of them. The enumeration is exhaustive: `grep` for `.rank =` and `.seatId =` across
`src/` returns eleven sites, and all eleven are accounted for below.

| Invariant | Held by | Citation |
|---|---|---|
| **INV-04** — a seat has at most one primary device | A seam refusal plus the shape of four writes, not a UI affordance. **`rank = "PRIMARY"` is written at exactly one place in the entire codebase outside the seed**, and it is preceded in the same synchronous block by the demotion of any incumbent on that seat, so two PRIMARY rows on one seat is a state no read can observe. The three side doors are shut: assignment forces SECONDARY, unassignment forces SECONDARY, and a PRIMARY row cannot exist with no seat because `NOT_ASSIGNED` refuses first. `updateDevice` cannot reach `rank` — `DevicePatch` has no field for it. The seed enters the run compliant: `seat-a-01` holds one PRIMARY (`dev-01`), `seat-a-02` holds one (`dev-03`), no seat holds two, so the induction has a valid base. | promote `mock/devices.ts:194`; demote `:186-193`; forced SECONDARY `:120`, `:141`, `:53`; `NOT_ASSIGNED` `:173`; `DevicePatch` `types.ts:148`; seed `fixtures.ts:78-82` |
| **INV-05** — a seat's primary device must be owned by that seat's occupant | Guarded in both directions by refusals in `src/lib/data/`, and deliberately **not** by filtering the owner picker — the picker is unfiltered at `devices-manager.tsx:520-524`, which is correct, because a list that omits a row is not a check when the action is reachable without the list. Designation moving, owner still: `SEAT_HAS_NO_OCCUPANT` fires before `OWNER_IS_NOT_OCCUPANT`, so an absent occupant is never reported as a mismatch and AC-8 stays distinguishable from AC-10. Owner moving, designation still: `updateDevice` refuses and writes nothing at all — the first write is at `:92`, after every check. The `seat === undefined` arm refuses rather than permits. The seed is compliant: `dev-01` is PRIMARY on `seat-a-01`, occupied by `mem-admin`, and owned by `mem-admin`; `dev-03` is PRIMARY on `seat-a-02`, occupied by and owned by `mem-manager`. | `mock/devices.ts:178`, `:182`, `:85-90`, `:87`; seed `fixtures.ts:58,59,78,80` |
| **INV-06** — on occupant exit the primary auto-downgrades | Engaged in one direction only and the obligation is negative, which is discharged rather than implemented. This ticket builds no occupant-exit path and writes nothing on a seat: `mock/seats.ts`, `mock/members.ts`, `mock/rooms.ts`, `mock/store.ts` and `fixtures.ts` are all reported clean by `git status --porcelain`. `seat.occupantId` is read only for comparison, never assigned. What it must not do is create a state the downgrade could not act on, and it does not: `unassignDevice` clears `seatId` and `rank` together so a designation is never orphaned from its seat, and `SEAT_HAS_NO_OCCUPANT` prevents a primary on an unoccupied seat. The one exit path that exists — `deleteRoom` — still detaches and demotes, unchanged. | untouched: `git status --porcelain src/lib/data/fixtures.ts src/lib/data/mock/{store,seats,members,rooms}.ts` empty; `mock/devices.ts:140-141`, `:178`; exit path `mock/rooms.ts:76-77` |
| **INV-07** — devices may exist unassigned in inventory | Held by `Device.seatId` being nullable and by two writes that use it, not by an affordance. `createDevice` makes inventory the state a device is born into; `unassignDevice` makes it the state a device returns to **and the row survives**, which is the whole distinction between unassigning and deleting. `deleteDevice` is the only function in this ticket that removes a row, and the surface keeps the two apart: *Unassign* is a direct control and *Delete* goes through a confirmation dialog. The seeded ownerless, unassigned `AST-0005` renders as an ordinary row. | `mock/devices.ts:52`, `:140-142`, `:216`; controls `devices-manager.tsx:403` vs `:432`; render `devices-manager.tsx:317,328,344,362` |

**No invariant violation was found. Nothing escalates under RULE-07.**

## Findings

None. All nine checks pass with citations.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | none | — | — |

`rework_count` stays at `0`.

## Carried into QA

Not findings, and none of them affects the verdict — recorded because the QA gate inherits them and
`04-review.md` is where the next stage looks.

1. **F-1 to F-5 are still open against `01-story.md`.** `99-questions.md` routes all five to `ba`
   under RULE-14. F-1 is the one with teeth: the duplicate-asset-tag refusal exists in the code
   (`mock/devices.ts:43`, `actions/devices.ts:143`) and in design section 6
   (`device-create-tag-error`), and **no acceptance criterion names it**, so QA cannot test it
   without inventing one, which RULE-05 forbids. These were safe to carry into IN_PROGRESS and are
   not safe to carry into QA.
2. **`tests/e2e/smoke.spec.ts:57` asserts `devices-row-dev-05` and will fail.** Rows are keyed by
   `assetTag`, so the row is now `devices-row-AST-0005`. The design predicted this, put the file in
   `allowed_paths` for it, and assigned the repair to QA (section 5). One selector string changes and
   no behaviour does — the INV-07 assertion still holds, because the seat cell still renders
   `unassigned` (`devices-manager.tsx:328`). This is not a defect in the implementation and is not
   charged to the Developer.
3. **`03-impl-log.md` open question 3 — a second row control pressed before `router.refresh()` lands
   reads the previous render's row.** Reviewed and it is not an R-check failure: `pending` is set
   around every action (`devices-manager.tsx:203,208,217,222`), the write itself is correct because
   the action re-reads the device by id at the seam, and what is stale is one line of confirmation
   text. It is inherited unchanged from `rooms-manager.tsx`, so answering it here for devices alone
   would leave the two surfaces divergent. It belongs to `tech-lead-design` as a question spanning
   both, not to this gate and not to REWORK.

## Verdict

**`PASS`.** R1 through R9 pass, each with a `file:line` citation. The contract in design section 1 is
implemented in full, the permission model matches section 2 exactly — six absent checks, each
commented at the line it will occupy, and no `PermissionGate` anywhere — all 44 selectors in section
6 exist, and all four invariants in `invariants_touched` are held by seam refusals or by the shape of
a write rather than by a UI affordance.

The ticket advances to `QA`.
