---
ticket: SEA-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-24T10:15:00Z
inputs_read: [ .ai/board/tickets/SEA-01/01-story.md, .ai/board/tickets/SEA-01/02-design.md, .ai/board/tickets/SEA-01/03-impl-log.md, .ai/board/tickets/SEA-01/ticket.yaml, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/01-operating-model.md, .ai/templates/review-report.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# SEA-01 — Seat occupancy — assign and release — review report

Nine checks, nine citations, no finding. The verdict is `PASS` and the ticket advances to QA.

This session was fresh, read files only, and had no message channel to the Developer or to any other
agent (RULE-13). `chat_before_verdict: none` is true as written.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Nine paths attributable to this ticket, each matched to a `ticket.yaml:allowed_paths` entry — table below |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, exit `0`, no diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, exit `0`, no output |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `src/app/(app)/seats/page.tsx:4` imports `@/lib/data`; grep for `lib/data/prisma`, `@prisma/client`, `PrismaClient` across `src/app` and `src/components` returns nothing |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | 20 items, each cited in *R5 detail* |
| R6 | Permission gating matches design section 2 | **PASS** | `src/actions/seats.ts:107-112,146-149` — two absent checks, each commented; no `PermissionGate`, `can()` or `ROLE_RANK` call in any ticket file |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | 18 selectors, all located — table below |
| R8 | No invariant violated (RULE-07) | **PASS** | Seven IDs reasoned individually in *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `git diff main -- package.json pnpm-lock.yaml` is empty; `git status --porcelain package.json pnpm-lock.yaml` reports both clean |

## R1 detail

Nine paths are modified or untracked in the working tree, all attributable to this ticket and matched to `allowed_paths`:

| Path in the diff | `allowed_paths` entry | Evidence it is this ticket's |
|---|---|---|
| `src/lib/data/types.ts` | `src/lib/data/types.ts` | Two outcome types added, `types.ts:104-124`; no existing type modified |
| `src/lib/data/mock/seats.ts` | `src/lib/data/mock/seats.ts` | Two write functions, `mock/seats.ts:36-88` |
| `src/lib/data/prisma/seats.ts` | `src/lib/data/prisma/seats.ts` | Two `notWired` stubs, `prisma/seats.ts:21-34` |
| `src/lib/validation/seat.ts` | `src/lib/validation/seat.ts` | Schemas and inputs, `validation/seat.ts:9-29` |
| `src/actions/seats.ts` | `src/actions/seats.ts` | `assignSeat` and `releaseSeat`, `actions/seats.ts:103-166` |
| `src/app/(app)/seats/page.tsx` | `src/app/(app)/seats/page.tsx` | Rewritten `SeatsPage`, `page.tsx:40-71` |
| `src/app/(app)/seats/seats-manager.tsx` | `src/app/(app)/seats/seats-manager.tsx` | `SeatsManager` component, `seats-manager.tsx:81-300` |
| `.ai/board/tickets/SEA-01/03-impl-log.md` | `.ai/board/tickets/SEA-01/**` | Implementation log artifact |
| `.ai/board/tickets/SEA-01/ticket.yaml` | `.ai/board/tickets/SEA-01/**` | Ticket state update |

`tests/` is clean — `git status --porcelain tests/` is empty — which matches the design's assignment of `tests/**` to QA (02-design.md section 5). `node scripts/check-allowed-paths.mjs` exits 0 with `PASS`.

## R5 detail

Design section 1, item by item:

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 `AssignOccupantOutcome` | `src/lib/data/types.ts:104` | yes — `SEAT_NOT_FOUND \| MEMBER_NOT_FOUND \| SEAT_OCCUPIED` |
| §1.1 `ReleaseOccupantOutcome` | `src/lib/data/types.ts:122` | yes — `downgradedDeviceId: string \| null` on success, `SEAT_NOT_FOUND \| SEAT_NOT_OCCUPIED` on failure |
| §1.2 `assignSeatOccupant(seatId, memberId)` | `src/lib/data/mock/seats.ts:36`, `src/lib/data/prisma/seats.ts:21` | yes — arity 2, both sides |
| §1.2 `releaseSeatOccupant(seatId)` | `src/lib/data/mock/seats.ts:70`, `src/lib/data/prisma/seats.ts:30` | yes — arity 1, both sides |
| §1.2 rule 1 — check order: seat, member, occupancy | `src/lib/data/mock/seats.ts:41,45,49` | yes — `SEAT_NOT_FOUND` before `MEMBER_NOT_FOUND` before `SEAT_OCCUPIED` |
| §1.2 rule 2 — assign writes `occupantId` and nothing else | `src/lib/data/mock/seats.ts:53` | yes — one assignment statement; `devices` is not read or written |
| §1.2 rule 3 — demote before clear, no `await` between | `src/lib/data/mock/seats.ts:82,85` | yes — synchronous execution without interleaving `await` |
| §1.2 rule 4 — change `rank` on at most one device, `seatId` on none | `src/lib/data/mock/seats.ts:82` | yes — `primary.rank = "SECONDARY"`; `seatId` is never written |
| §1.2 — `members` from `../fixtures`, not `./store` | `src/lib/data/mock/seats.ts:6` | yes — avoids store collision with MEM-01 |
| §1.3 `seatIdSchema`, `occupantIdSchema`, `assignSeatSchema`, `releaseSeatSchema` | `src/lib/validation/seat.ts:9,15,21,26` | yes — exact schema shapes and inferred types |
| §1.4 `SeatFieldName`, `SeatActionError`, `SeatActionResult<T>`, `ReleaseSeatData` | `src/actions/seats.ts:21,32,37,42` | yes |
| §1.4 the four message constants | `src/actions/seats.ts:44-47` | yes — verbatim string constants |
| §1.4 `assignSeat(input: unknown)` | `src/actions/seats.ts:103` | yes — maps `SEAT_NOT_FOUND`→`NOT_FOUND`, `MEMBER_NOT_FOUND`→`REFUSED`/`occupantId`, `SEAT_OCCUPIED`→`REFUSED`/`null` |
| §1.4 `releaseSeat(input: unknown)` | `src/actions/seats.ts:142` | yes — maps `SEAT_NOT_FOUND`→`NOT_FOUND`, `SEAT_NOT_OCCUPIED`→`REFUSED`/`null` |
| §1.4 both actions revalidate `/seats` and `/devices` | `src/actions/seats.ts:132-133,160-161` | yes — both paths on both actions |
| §1.5 rule 1 — assign only on vacant, release only on occupied | `src/app/(app)/seats/seats-manager.tsx:226-248` | yes — conditional render on `r.seat.occupantId === null` |
| §1.5 rule 2 — AC-3 and AC-8 have no UI route | `src/app/(app)/seats/seats-manager.tsx:226-248` | yes — verified at seam / action level |
| §1.5 rule 3 — no status control; status derived dynamically | `src/app/(app)/seats/seats-manager.tsx:209-215` | yes — `deriveSeatStatus(r.seat)` on render; no status state |
| §1.5 rule 4 — no device shown, chosen, or edited | `src/app/(app)/seats/seats-manager.tsx` | yes — zero device elements on seats page |
| §1.5 rule 5 — release is bare row control, no dialog | `src/app/(app)/seats/seats-manager.tsx:239-247` | yes |
| §1.5 `SeatRow`, `OccupantOption` | `src/app/(app)/seats/page.tsx:13,26` | yes — declared as specified |

## R7 detail

All 18 selectors from 02-design.md section 6 located in the markup:

| data-testid | Element | Citation |
|---|---|---|
| `seats-page` | Seat occupancy screen root | `src/app/(app)/seats/page.tsx:66` |
| `seats-table` | Seat list table | `src/components/shared/DataTable.tsx:29` (prefix `seats` from `seats-manager.tsx:161`) |
| `seats-empty` | Empty-state message | `src/components/shared/DataTable.tsx:25` (prefix `seats`) |
| `seats-row-<code>` | Table row keyed by seat code | `src/components/shared/DataTable.tsx:39` (key `r.seat.code` from `seats-manager.tsx:160`) |
| `seats-row-<code>-code` | Seat code cell | `src/app/(app)/seats/seats-manager.tsx:168` |
| `seats-row-<code>-room` | Room code cell | `src/app/(app)/seats/seats-manager.tsx:176` |
| `seats-row-<code>-ports` | Ports list cell | `src/app/(app)/seats/seats-manager.tsx:185` |
| `seats-row-<code>-occupant` | Occupant name or literal `no occupant` | `src/app/(app)/seats/seats-manager.tsx:196` |
| `seats-row-<code>-status` | Status badge (`OCCUPIED` / `VACANT`) | `src/app/(app)/seats/seats-manager.tsx:211` |
| `seats-row-<code>-assign` | Assign button on vacant row | `src/app/(app)/seats/seats-manager.tsx:234` |
| `seats-row-<code>-release` | Release button on occupied row | `src/app/(app)/seats/seats-manager.tsx:244` |
| `seats-action-error` | Page-level action refusal error | `src/app/(app)/seats/seats-manager.tsx:149` |
| `seat-assign-dialog` | Assign modal dialog | `src/components/shared/EntityFormDialog.tsx:35` (prefix `seat-assign` from `seats-manager.tsx:261`) |
| `seat-assign-occupant` | Occupant select dropdown | `src/app/(app)/seats/seats-manager.tsx:281` |
| `seat-assign-occupant-error` | Occupant validation error | `src/app/(app)/seats/seats-manager.tsx:61,64` rendered at `:294` |
| `seat-assign-seat` | Display of seat code in dialog | `src/app/(app)/seats/seats-manager.tsx:268` |
| `seat-assign-cancel` | Cancel button in assign dialog | `src/components/shared/EntityFormDialog.tsx:39` (prefix `seat-assign`) |
| `seat-assign-submit` | Submit button in assign dialog | `src/components/shared/EntityFormDialog.tsx:42` (prefix `seat-assign`) |

## R8 detail

One row per ID in `invariants_touched` (`[INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, INV-07]`):

| Invariant | Held by | Citation |
|---|---|---|
| **INV-01** — a seat has at most one occupant | Seam refusal `SEAT_OCCUPIED` when `seat.occupantId !== null`. Under `prisma`, `Seat.occupantId` is a single nullable reference (`prisma/schema.prisma:114`) structurally preventing multiple occupants. | `src/lib/data/mock/seats.ts:49-50`; `prisma/schema.prisma:114` |
| **INV-02** — one person may occupy multiple seats | Absence of cardinality constraint on member occupancy across seats. No check restricts assigning an already-occupying member to another seat. | `src/lib/data/mock/seats.ts:36-55` |
| **INV-03** — seat status is derived, never stored as a column | `deriveSeatStatus` is called dynamically on render; no `status` column exists in `types.ts:82-88`, `page.tsx:13-19`, or component state. | `src/lib/data/derive.ts:16-19`; `src/app/(app)/seats/seats-manager.tsx:210,213` |
| **INV-04** — a seat has at most one primary device | Release path only ever downgrades `rank = "PRIMARY"` to `"SECONDARY"`, never promotes; assignment path never reads or writes devices (`rank = "PRIMARY"` is never set). | `src/lib/data/mock/seats.ts:79-84` (demote); `:52-54` (assign touches no devices) |
| **INV-05** — a seat's primary device must be owned by that seat's current occupant | Synchronous execution demotes `primary.rank = "SECONDARY"` immediately before clearing occupancy (`seat.occupantId = null`), preventing any observable state of a vacant seat with a primary device. Assignment never promotes existing devices on the seat. | `src/lib/data/mock/seats.ts:79-85`; `:52-54` |
| **INV-06** — when an occupant exits, that seat's primary device auto-downgrades to secondary | `releaseSeatOccupant` automatically locates any primary device on the seat and demotes it to `"SECONDARY"`, returning `downgradedDeviceId`. | `src/lib/data/mock/seats.ts:79-84` |
| **INV-07** — devices may exist unassigned in inventory | Releasing an occupant demotes device rank but preserves `device.seatId` and does not delete devices or unassign them to inventory. | `src/lib/data/mock/seats.ts:79-85` |

No invariant violation was found. Nothing escalates under RULE-07.

## Findings

None. All nine checks pass with citations.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | none | — | — |

`rework_count` stays at `0`.

## Carried into QA

1. **F-1, F-3, F-4 remain open against `01-story.md`.** F-4 (`MEMBER_NOT_FOUND` has no acceptance criterion) was specified in design section 1.1 and implemented at `mock/seats.ts:45`, `actions/seats.ts:122`, rendering at `seat-assign-occupant-error`. QA cannot invent an AC (RULE-05); F-3's recommendation that AC-6 drop references to seeded `dev-01` is satisfied by the constructed Given in 02-design.md section 6.1.
2. **`tests/e2e/smoke.spec.ts:50-51` fails until updated by QA.** The Phase B selectors `seats-status-seat-a-01` and `seats-status-seat-a-03` were re-keyed to `seats-row-<code>-status`. 02-design.md section 6.2 assigns the fixture-blind rewrite of this test to QA.
3. **03-impl-log.md open questions 3 and 4.** Dialog refusal placement (`SEAT_OCCUPIED` in assign dialog) and rapid double-click on row release before `router.refresh()` completes are documented design behaviors consistent with `devices-manager.tsx`.

## Verdict

**`PASS`.** R1 through R9 pass, each with a `file:line` citation. Contract, permission model, testability contract, and domain invariants are fully satisfied.

The ticket advances to `QA`.
