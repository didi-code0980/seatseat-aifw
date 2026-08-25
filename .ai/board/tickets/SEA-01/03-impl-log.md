---
ticket: SEA-01
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-24T10:08:42Z
inputs_read: [ .ai/board/tickets/SEA-01/02-design.md, .ai/board/tickets/SEA-01/01-story.md, .ai/board/tickets/SEA-01/ticket.yaml, .ai/steward/context.md, CLAUDE.md, .ai/standards/coding-standards.md, .ai/standards/testing-standards.md, .ai/templates/impl-log.md, .ai/board/tickets/DEV-01/03-impl-log.md, .ai/board/tickets/DEV-01/04-review.md, prisma/schema.prisma, src/lib/data/types.ts, src/lib/data/index.ts, src/lib/data/derive.ts, src/lib/data/fixtures.ts, src/lib/data/mock/store.ts, src/lib/data/mock/seats.ts, src/lib/data/mock/devices.ts, src/lib/data/mock/rooms.ts, src/lib/data/mock/members.ts, src/lib/data/prisma/seats.ts, src/lib/data/prisma/client.ts, src/actions/devices.ts, src/lib/validation/device.ts, src/app/(app)/seats/page.tsx, src/app/(app)/devices/page.tsx, src/app/(app)/devices/devices-manager.tsx, src/app/(app)/rooms/rooms-manager.tsx, src/components/shared/DataTable.tsx, src/components/shared/EntityFormDialog.tsx, src/components/shared/EmptyState.tsx, src/components/ui/Badge.tsx, src/components/ui/Button.tsx, src/components/ui/Select.tsx, src/components/ui/Dialog.tsx, src/components/ui/Input.tsx, tests/e2e/smoke.spec.ts, eslint.config.mjs, playwright.config.ts, package.json ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# SEA-01 — Seat occupancy, assign and release — implementation log

Seven files, all inside `allowed_paths`, and no file outside it was written. `tests/**` was **not**
written — see *Open questions* item 1, which is the same call `DEV-01` made and the reviewer upheld.

`consulted` is empty. Nothing in the design needed an answer before it could be built: sections 1.1
to 1.5 name every type, every reason code, every message string and every selector, and section 1.2
carries a reference implementation for the mock which was taken as written.

---

## Files touched

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/lib/data/types.ts` | modified | The two outcome types the seam's new functions return. Additive: no existing type is modified, which is what keeps `size` out of the XL row. | §1.1 |
| `src/lib/data/mock/seats.ts` | modified | `assignSeatOccupant` and `releaseSeatOccupant`, the only implementations of either. INV-01's check and INV-06's downgrade both live here. | §1.2 |
| `src/lib/data/prisma/seats.ts` | modified | The same two names at the same arity, both `notWired(...)`. Nothing is wired and nothing needs to be; this is what keeps `tests/unit/seam-parity.test.ts` green. | §1.2 |
| `src/lib/validation/seat.ts` | created | The runtime half of the contract. AC-9's "no member chosen" is refused by `occupantIdSchema` and nowhere else. | §1.3 |
| `src/actions/seats.ts` | created | `assignSeat` and `releaseSeat`, each running the five steps in order, each mapping every seam reason to the `kind`/`field`/message the design's table fixes. | §1.4 |
| `src/app/(app)/seats/page.tsx` | modified | Rewritten from the Phase B read-only scaffold: three seam reads joined into `SeatRow[]` plus the occupant option list. It had no occupant column and no controls. | §1.5 |
| `src/app/(app)/seats/seats-manager.tsx` | created | The client half — the table, the two row controls, the assign dialog, the page-level refusal region. Holds no copy of the seat list and no copy of any seat's status. | §1.5 |
| `.ai/board/tickets/SEA-01/03-impl-log.md` | created | This document — the stage's artifact and its gate record. | n/a, artifact |
| `.ai/board/tickets/SEA-01/ticket.yaml` | modified | `state` advanced `IN_PROGRESS` -> `REVIEW` on this gate passing, with the reason recorded as a comment beside it. No gate key was invented. | n/a, board state |

Nine paths, every one of them inside `allowed_paths`.

---

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.1 `AssignOccupantOutcome` | `src/lib/data/types.ts:104` | Verbatim, including the three-arm reason union. No `SEAT_ALREADY_OCCUPIED_BY_THIS_MEMBER` arm. |
| §1.1 `ReleaseOccupantOutcome` | `src/lib/data/types.ts:122` | Verbatim. `downgradedDeviceId` is `string \| null` on the success arm only. |
| §1.2 `assignSeatOccupant(seatId, memberId)` | `src/lib/data/mock/seats.ts:36`, `src/lib/data/prisma/seats.ts:21` | Same name, arity 2, both sides. |
| §1.2 `releaseSeatOccupant(seatId)` | `src/lib/data/mock/seats.ts:70`, `src/lib/data/prisma/seats.ts:30` | Same name, arity 1, both sides. |
| §1.2 rule 1 — check order seat, member, occupancy | `mock/seats.ts:41`, `:44`, `:49` | `SEAT_NOT_FOUND` then `MEMBER_NOT_FOUND` then `SEAT_OCCUPIED`, in that order and no other. Verified against a live store: a missing seat with a missing member reports `SEAT_NOT_FOUND`, not `MEMBER_NOT_FOUND`. |
| §1.2 rule 2 — assign writes `occupantId` and nothing else | `mock/seats.ts:53` | One assignment statement in the whole function. `devices` is never read on this path. |
| §1.2 rule 3 — demote before clear, no `await` between | `mock/seats.ts:82` then `:85` | Two synchronous statements, no `await` between them and none inside the `find`. The vacant-seat-with-a-PRIMARY-device state is never observable. |
| §1.2 rule 4 — one `rank` write, no `seatId` write | `mock/seats.ts:82` | `primary.rank` is the only device field assigned anywhere in this file. `seatId` appears only in a comparison. |
| §1.2 — `members` from `../fixtures`, not `./store` | `mock/seats.ts:6` | Stated in the import comment, because `MEM-01` is running in parallel and may add a `members` export to `store.ts`. |
| §1.3 `seatIdSchema`, `occupantIdSchema`, `assignSeatSchema`, `releaseSeatSchema` | `src/lib/validation/seat.ts:9,15,21,26` | Field names `seatId` and `occupantId` exactly. No `seatCodeSchema`, no `gridX`. |
| §1.4 `SeatFieldName`, `SeatActionError`, `SeatActionResult<T>`, `ReleaseSeatData` | `src/actions/seats.ts:21,32,37,42` | Verbatim. |
| §1.4 the four message constants | `src/actions/seats.ts:44-47` | Assertable by value, character for character with the design's table. |
| §1.4 `assignSeat(input: unknown)` | `src/actions/seats.ts:103` | Reason mapping at `:118-124`: `SEAT_NOT_FOUND`→`NOT_FOUND`, `MEMBER_NOT_FOUND`→`REFUSED`/`occupantId`, `SEAT_OCCUPIED`→`REFUSED`/`null`. |
| §1.4 `releaseSeat(input: unknown)` | `src/actions/seats.ts:142` | Reason mapping at `:152-154`: `SEAT_NOT_FOUND`→`NOT_FOUND`, `SEAT_NOT_OCCUPIED`→`REFUSED`/`null`. |
| §1.4 both actions revalidate both paths | `src/actions/seats.ts:132-133`, `:160-161` | `/seats` and `/devices` on each. Confirmed live: after an assign, `/devices` re-rendered the seat-occupant cell without a manual reload. |
| §1.5 rule 1 — assign only on vacant, release only on occupied | `seats-manager.tsx:226-249` | One ternary on `r.seat.occupantId === null`. There is no branch in which both render and none in which neither does. |
| §1.5 rule 2 — AC-3 and AC-8 have no UI route | `seats-manager.tsx:226` | A consequence of rule 1, not a second mechanism. Both refusals live in the seam and the action and are unreachable from the markup. |
| §1.5 rule 3 — no status control; status derived on every read | `seats-manager.tsx:210-213` | `deriveSeatStatus(r.seat)` at render. No `status` in `useState`, no `status` field on `SeatRow`. |
| §1.5 rule 4 — no device is shown, chosen or edited | `seats-manager.tsx` (absence) | Confirmed live: zero elements inside `seats-page` carry a testid containing `device`, `primary`, `rank` or `grid`, and zero inside the assign dialog. |
| §1.5 rule 5 — release is a bare row control, no confirmation | `seats-manager.tsx:239-247` | No `Dialog` for release. The only dialog on this surface is the assign form. |
| §1.5 `SeatRow`, `OccupantOption` | `src/app/(app)/seats/page.tsx:13`, `:26` | Three fields and two fields, exactly as specified. The join happens in the page, not behind a `listSeatRows()`. |

---

## Deviations from the design

**One, and it is an import path rather than a behaviour.**

**`deriveSeatStatus` is imported from `@/lib/data/derive` rather than reached as
`seats.deriveSeatStatus` through the seam index** — `seats-manager.tsx:31`, used at `:210` and
`:213`. §1.5 rule 3 specifies the call as `seats.deriveSeatStatus(seat)`.

The status cell renders inside the client half, because §1.5 puts the table there and the two row
controls are on the same rows. Reaching it as `seats.deriveSeatStatus` requires
`import { seats } from "@/lib/data"` in a `"use client"` module, and that has two real consequences:
the seam's whole module graph — `fixtures.ts` included — is pulled into the browser bundle, and
`src/lib/data/index.ts:44` reads `process.env.DATA_SOURCE`, which is not exposed to the client, so
the browser copy of the switch would resolve to `mock` in every deployment including a Prisma one.
`devices-manager.tsx` and `rooms-manager.tsx` both keep the seam out of the client half for the first
of those reasons, and §1.5 says this page is split "as every other manager screen is".

What is imported instead is the same function object. `src/lib/data/derive.ts` exists precisely so
that one derivation is shared: both `mock/seats.ts:12` and `prisma/seats.ts:6` re-export it rather
than deriving separately, so `deriveSeatStatus(seat)` cannot drift from what the seam returns. It
reaches no data — it takes the `Seat` this component was already handed and returns a string — so
RULE-02 is not crossed by it, the `no-restricted-imports` rule does not name it, and
`tests/unit/permissions.test.ts:4` already imports it by this path.

The two alternatives were both worse and are named so the reviewer can weigh them: importing the seam
into the client (above), or computing the status in `page.tsx` and adding a fourth field to `SeatRow`
— which is a field name the contract does not carry (RULE-04) and puts a derived value on the wire
beside the field it derives from.

Nothing else in sections 1 through 7 was built differently.

---

## Invariants

| ID | Still holds because |
|----|---------------------|
| `INV-01` — a seat has at most one occupant | `mock/seats.ts:49` refuses an assignment to a seat whose `occupantId` is not null, before any write. It is the only write path to occupancy in the system, and there is no second entry point: `src/actions/seats.ts:116` calls it and nothing else does. Under `prisma` the column is a single nullable reference (`prisma/schema.prisma:114`) and cannot hold two. Verified: assigning member B to an occupied seat returns `SEAT_OCCUPIED` and leaves member A in place. |
| `INV-02` — one person may occupy several seats | Held by the absence of a check, which is the only way it can be held. `assignSeatOccupant` never counts the member's other seats — the function body contains no query over `seats` other than the `find` for the target. Verified positively rather than by inspection: one member was assigned to two vacant seats in succession and the second assignment succeeded. |
| `INV-03` — seat status is derived, never stored | No `status` is written anywhere: not on `Seat` (`types.ts:68-89` is unchanged), not in `SeatRow` (`page.tsx:13`), not in `useState` (`seats-manager.tsx:90-95` holds a dialog target, a pending flag and two error slots and nothing else). The cell calls `deriveSeatStatus` on every render, and the surface offers no control that could write a status — confirmed live, zero interactive elements under any `-status` testid. |
| `INV-04` — a seat has at most one primary device | Engagement is one-directional, as `01-story.md` records. **No code path in this ticket sets `rank = "PRIMARY"`** — `grep -n 'PRIMARY' src/lib/data/mock/seats.ts` returns one line, `:79`, and it is a comparison inside a `find`. The single rank write is `:82`, to `"SECONDARY"`. So this ticket can only ever reduce the count of primaries on a seat, never raise it. AC-11's risk — a promotion on assignment — does not exist because the assign path reads no device at all. |
| `INV-05` — a seat's primary device is owned by its current occupant | The state that would break it is a seat whose occupant changed while a primary device stayed behind, and both ends are closed. On release, the demotion at `mock/seats.ts:82` and the occupancy clear at `:85` are two synchronous statements with no `await` between them, so a vacant seat carrying a PRIMARY device is never observable. On assignment, no device is read or written, so the new occupant cannot inherit the previous occupant's primary designation — verified: after a release-then-assign to a different member, the seat still had no primary device and no device's owner had moved. |
| `INV-06` — an occupant exit downgrades that seat's primary device to secondary | `mock/seats.ts:79-84` is the write path the ledger says must exist, and this is the ticket that builds it. It fires on the only occupant-exit path this surface has, before the occupancy is cleared, and reports itself through `downgradedDeviceId` so the effect is assertable at the seam rather than inferred. It cannot fire on a seat that had no occupant to lose, because AC-8's refusal at `:76` returns first. Verified end to end: releasing a seat demoted its primary device and `/devices` rendered `SECONDARY` for it. |
| `INV-07` — devices may exist unassigned in inventory | The release path writes `rank` on one device and `seatId` on none — `seatId` is never on the left of an assignment in `mock/seats.ts`. So a release changes a designation and never puts a device into inventory, which is assumption `A-2` and AC-7. Verified: after releasing a seat holding two devices, both were still assigned to that same seat, neither was PRIMARY, neither was deleted, and neither owner had changed. |

No invariant violation was found. RULE-07 was not reached.

---

## Verification run

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | `tsc --noEmit`, clean. |
| `pnpm lint` | 0 | `eslint .`, clean. No `no-restricted-imports` violation and no inline disable of it. |
| `pnpm test` | 0 | 4 files, 61 tests. `tests/unit/seam-parity.test.ts` passes with the two new names on both sides at matching arity — the check that the Prisma stubs were not forgotten, and not editable by this ticket. |
| `pnpm build` | 0 | `next build` compiles and prerenders `/seats`. Run because §1.4 leans on `revalidatePath` and §6.2 says the e2e suite runs against a production build, so a build-only failure would surface at QA rather than here. The two Better Auth warnings are pre-existing and unrelated. |
| `pnpm test:e2e` | **1** | 37 passed, 1 failed. The one failure is `tests/e2e/smoke.spec.ts:50`, which the design predicted and which this stage deliberately did not repair — *Open questions* item 1. No other spec regressed. |
| `git diff --name-only` subset of `allowed_paths` | yes | The seven source files above plus this log. The working tree is otherwise clean — nothing outside `allowed_paths` is dirty, which was not true on `DEV-01`. |
| ad-hoc seam check, 26 assertions | 26/26 | See below. |
| ad-hoc UI check, 42 assertions | 42/42 | See below. |

**The two ad-hoc runs, and why they exist.** The gate for this stage is typecheck and lint, and
neither exercises a single one of §1.2's four rules. `tests/**` belongs to QA, so both checks were
run from the session scratch directory outside the repository and neither survives. **No file under
`tests/` was created, modified, or read for either.** They are not a substitute for the QA gate; they
are the difference between reporting that the contract is implemented and knowing it.

The seam check imported `mock/seats.ts`, `mock/devices.ts` and `mock/members.ts` directly under
`tsx` and exercised: AC-3's `SEAT_OCCUPIED` with the occupant unchanged; F-4's `MEMBER_NOT_FOUND`;
the check order, by calling with both a missing seat and a missing member and confirming
`SEAT_NOT_FOUND` wins; AC-2 and AC-4's two-seat assignment; AC-8's refusal with a byte-identical
device table before and after; AC-6 and AC-7 on the constructed two-device Given §6.1 specifies —
`downgradedDeviceId` naming the right device, that device SECONDARY and still on its seat with its
owner intact, the second device untouched, and the seat left with no primary; AC-11's assignment onto
that state promoting nothing and moving no owner; and AC-10's three-write status sequence.
Twenty-six assertions, twenty-six passing.

The UI check drove a headless Chromium against `next start` on port 3102 in mock mode and covered:
AC-1's six cells and both row controls, including that the assign control is absent on an occupied
seat and the release control absent on a vacant one; AC-9's validation message with the seat still
vacant afterwards; AC-2's assign with the status following without a reload and INV-02 visible on the
surface — one member occupying three seats at once; AC-5's release; AC-10's third write; AC-6's
downgrade read on `/devices`, including that the devices page saw the new occupancy, which is the
`revalidatePath("/devices")` in `assignSeat` doing its job; and §1.5 rule 4's absence of any device
element. It restored the seeded occupancy it changed before finishing, per §6.2 constraint 2.
Forty-two assertions, forty-two passing.

One assertion failed on its first run and the cause was the check itself: it looked for testids
containing `device` across the whole page and found `nav-devices`, the app-shell link. Re-scoped to
inside `seats-page` and inside the assign dialog, both counts are zero.

---

## Testability contract

All 18 selectors from §6. Two prefixes come from shared components and are reused rather than
redefined: `DataTable` at `seats-manager.tsx:161` with `testIdPrefix="seats"`, and
`EntityFormDialog` at `:261` with `testIdPrefix="seat-assign"`.

| `data-testid` | Exists at |
|---------------|-----------|
| `seats-page` | `src/app/(app)/seats/page.tsx:66` |
| `seats-table` | `src/components/shared/DataTable.tsx:29`, prefix from `seats-manager.tsx:161` |
| `seats-empty` | `src/components/shared/DataTable.tsx:25`, same prefix |
| `seats-row-<code>` | `src/components/shared/DataTable.tsx:39`, key from `seats-manager.tsx:160` (`r.seat.code`) |
| `seats-row-<code>-code` | `src/app/(app)/seats/seats-manager.tsx:168` |
| `seats-row-<code>-room` | `src/app/(app)/seats/seats-manager.tsx:176` |
| `seats-row-<code>-ports` | `src/app/(app)/seats/seats-manager.tsx:185` |
| `seats-row-<code>-occupant` | `src/app/(app)/seats/seats-manager.tsx:196` |
| `seats-row-<code>-status` | `src/app/(app)/seats/seats-manager.tsx:211` |
| `seats-row-<code>-assign` | `src/app/(app)/seats/seats-manager.tsx:234` |
| `seats-row-<code>-release` | `src/app/(app)/seats/seats-manager.tsx:244` |
| `seats-action-error` | `src/app/(app)/seats/seats-manager.tsx:149` |
| `seat-assign-dialog` | `src/components/shared/EntityFormDialog.tsx:35`, prefix from `seats-manager.tsx:261` |
| `seat-assign-occupant` | `src/app/(app)/seats/seats-manager.tsx:281` |
| `seat-assign-occupant-error` | `src/app/(app)/seats/seats-manager.tsx:64`, rendered from `:294` |
| `seat-assign-seat` | `src/app/(app)/seats/seats-manager.tsx:268` |
| `seat-assign-cancel` | `src/components/shared/EntityFormDialog.tsx:39`, same prefix |
| `seat-assign-submit` | `src/components/shared/EntityFormDialog.tsx:42`, same prefix |

Every one of the eighteen was located in the rendered markup during the ad-hoc UI run, except
`seats-empty`, which renders only when no seat exists and the seed holds twelve. It is emitted by
`DataTable` on the same prefix as `seats-table` and is unreachable while any seat exists.

Three of them are **absent until something makes them appear**, which is the specified behaviour and
not a missing selector: `seats-action-error` until a row action is refused,
`seat-assign-occupant-error` until the occupant field is rejected, and `seat-assign-dialog` until the
assign control is pressed.

No selector was renamed in passing. The Phase B `seats-status-<id>` is gone, replaced by
`seats-row-<code>-status` per §6 — that is the re-key, and it is the subject of *Open questions*
item 1.

---

## Open questions

**1 — `tests/e2e/smoke.spec.ts:50-51` is now broken and this stage deliberately did not repair it.**
It asserts `seats-status-seat-a-01` and `seats-status-seat-a-03`; rows are re-keyed by `code`, so the
elements are `seats-row-SEAT-A-01-status` and `seats-row-SEAT-A-03-status`. The design predicted this
exactly, put the file in `allowed_paths` for it (F-6, §5), and specified the replacement in §6.2 —
**a fixture-blind assertion over the status cells, at least one `OCCUPIED` and at least one `VACANT`,
located by attribute prefix and suffix**, in the shape `smoke.spec.ts:68` already uses for devices.
This is `DEV-01`'s situation repeated: there the design assigned the repair to QA, the Developer left
it, and `DEV-01/04-review.md` item 2 recorded that it is "not a defect in the implementation and is
not charged to the Developer". The same call is made here for the same reason — `tests/**` is QA's,
and §6.2 is the QA-facing section. **`pnpm test:e2e` fails on that one test until QA changes it**;
37 of 38 pass. Flagged loudly because a reviewer running the suite will hit it.

**2 — the design's three RULE-14 amendments to `01-story.md` are still open.** F-1 (AC-1's *seat
identifier* resolves to `code`), F-3 (AC-6 should stop naming `dev-01` and `ROOM-A`) and F-4
(`MEMBER_NOT_FOUND` has no acceptance criterion) were routed to `ba` by `02-design.md` §0 and none has
been answered. None blocked this stage. **F-4 is the one with teeth, and it is `DEV-01`'s F-1 again:**
the refusal exists in the code (`mock/seats.ts:44`, `actions/seats.ts:122`), it has a message in the
contract and a selector to render it in (`seat-assign-occupant-error`), and no acceptance criterion
names it — so QA cannot write a test for it without inventing one, which RULE-05 forbids. F-3 matters
to QA differently: AC-6 as written names seeded data, and §6.2 constraint 3 forbids quoting any. The
constructed Given in §6.1 satisfies both readings, so QA is not blocked either way.

**3 — §1.4 maps `assignSeat`'s `SEAT_OCCUPIED` to `field: null` and calls that "the page-level
region", but the assign dialog is open when that refusal can occur.** It renders as a loose message
inside the dialog (`seats-manager.tsx:296`), which is what `devices-manager.tsx:530,559` does with
the same shape, rather than in `seats-action-error` behind the open dialog. `seats-action-error` is
fed only by the release row control, which matches §6's description of it as "page-level message for
a refused **row action**". This is unobservable in practice — §1.5 rule 2 makes `SEAT_OCCUPIED`
unreachable through this UI, and §6.2 verifies AC-3 at the seam only — so no criterion and no
selector depends on the choice. Recorded because it is the one place where §1.4's prose and §6's
table could be read as pointing at different elements.

**4 — the row controls read the render they were drawn in, and `pending` clears before the refresh
lands.** Press *Release*, and between the action resolving and `router.refresh()` re-rendering there
is a window in which the row still shows the old occupant and the *Release* button is enabled again.
Pressing it a second time in that window sends a second `releaseSeat` for the same seat, which is
refused as `SEAT_NOT_OCCUPIED` and renders in `seats-action-error` — so nothing illegal is written
and no criterion is violated; the second press is simply refused. This is inherited unchanged from
`devices-manager.tsx`, where `DEV-01/03-impl-log.md` open question 3 and `04-review.md` item 3 both
recorded it and routed it to `tech-lead-design` as a question spanning every manager surface. It is
worth knowing here because on this surface the stale press hits a **refusal path with a visible
message**, where on devices it produced a stale confirmation string. It is not new and it is not this
ticket's to answer alone.

**5 — the IN_PROGRESS pass is recorded as this document's front matter `gate: PASS`, not as a fifth
key in `ticket.yaml`.** `.ai/templates/ticket.yaml` defines exactly four gate keys — `spec`,
`design`, `review`, `qa` — and `/ship` checks those four. No `impl:` key was invented. Recorded so
the reviewer does not read the missing key as a missing gate.

## Changelog

- `2026-08-24T10:08:42Z` — initial version, all sections. Raised by `developer`. Amended by
  `developer`. `consulted` is empty; nothing in the design required clarification before it could be
  built. One deviation declared, an import path for `deriveSeatStatus`, with the two alternatives
  named. Five open questions, none blocking; item 1 will fail `pnpm test:e2e` until QA repairs it.
