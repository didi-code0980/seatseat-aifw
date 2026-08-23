---
ticket: DEV-01
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-23T07:42:00Z
inputs_read: [ .ai/board/tickets/DEV-01/02-design.md, .ai/board/tickets/DEV-01/01-story.md, .ai/board/tickets/DEV-01/ticket.yaml, .ai/board/tickets/DEV-01/99-questions.md, .ai/steward/context.md, CLAUDE.md, .ai/standards/testing-standards.md, src/lib/data/types.ts, src/lib/data/index.ts, src/lib/data/fixtures.ts, src/lib/data/mock/store.ts, src/lib/data/mock/devices.ts, src/lib/data/mock/rooms.ts, src/lib/data/mock/seats.ts, src/lib/data/mock/members.ts, src/lib/data/prisma/devices.ts, src/lib/data/prisma/client.ts, src/actions/rooms.ts, src/actions/devices.ts, src/lib/validation/room.ts, src/lib/validation/device.ts, src/app/(app)/rooms/page.tsx, src/app/(app)/rooms/rooms-manager.tsx, src/app/(app)/devices/page.tsx, src/components/shared/DataTable.tsx, src/components/shared/EntityFormDialog.tsx, src/components/ui/Dialog.tsx, src/components/ui/Input.tsx, src/components/ui/Select.tsx, src/components/ui/Badge.tsx, src/components/ui/Button.tsx, tests/unit/seam-parity.test.ts, tests/e2e/smoke.spec.ts, playwright.config.ts, eslint.config.mjs, tsconfig.json, package.json ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# DEV-01 — Device CRUD UI — implementation log

Seven files touched, six of them named in `allowed_paths` and one of them the ticket's own log. No
file outside `allowed_paths` was written. `tests/**` was **not** written — see *Open questions*,
item 1, which is the one thing this stage deliberately leaves for QA and which the design assigns
there in terms.

The contract in `02-design.md` section 1 is implemented in full and unconditionally. The five
findings F-1 to F-5 were carried into this stage as `99-questions.md` says they safely could be:
none of them changed a signature, and none of them was answered here — answering them is `ba`'s
under RULE-14 and it must happen before `/qa`.

## Files touched

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/lib/data/types.ts` | modified | The eight seam DTOs the contract adds. Purely additive: no existing type is modified, which is the property section 5 leans on to keep this ticket out of the XL row. | §1.1 |
| `src/lib/data/mock/devices.ts` | modified | The six write functions, and the seven rules they must obey. This file is where INV-04 and INV-05 are held — under `DATA_SOURCE=mock` there is no index and no trigger, so it is the only mechanism. | §1.2, rules 1–7 |
| `src/lib/data/prisma/devices.ts` | modified | The same six names at the same arity, each `notWired(...)`. Nothing is wired and nothing needs to be; this is what keeps `tests/unit/seam-parity.test.ts` green. | §1.2 |
| `src/lib/validation/device.ts` | modified | The Zod half of the contract. `createDeviceSchema` is replaced because §1.3 gives it a different shape; everything else in the file is new beside it. | §1.3 |
| `src/actions/devices.ts` | modified | The six server actions, the five-step body, and the seam-reason to action-error mapping table. Step 3 carries the comment §2 requires, on all six. | §1.4 |
| `src/app/(app)/devices/page.tsx` | modified | Replaces the Phase B read-only scaffold. Reads the four existing seam functions and joins them into `DeviceRow[]`, `MemberOption[]` and `SeatOption[]`. | §1.5 |
| `src/app/(app)/devices/devices-manager.tsx` | created | The client half: four dialogs, two direct row actions, the pending flag, per-surface error state, and every `data-testid` in §6. | §1.5, §6 |
| `.ai/board/tickets/DEV-01/03-impl-log.md` | created | This log. | — |

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.1 `NewDevice` | `src/lib/data/types.ts:130` | `ownerId` non-nullable, per F-3. |
| §1.1 `DevicePatch` | `src/lib/data/types.ts:148` | Kept separate from `NewDevice` although structurally identical today, for the reason the contract gives. |
| §1.1 `CreateDeviceOutcome` | `src/lib/data/types.ts:155` | |
| §1.1 `UpdateDeviceOutcome` | `src/lib/data/types.ts:164` | Three reason codes, all three reachable. |
| §1.1 `AssignDeviceOutcome` | `src/lib/data/types.ts:172` | |
| §1.1 `UnassignDeviceOutcome` | `src/lib/data/types.ts:177` | |
| §1.1 `DesignatePrimaryOutcome` | `src/lib/data/types.ts:193` | Four reason codes kept distinct, so a test can tell AC-8 from AC-10. |
| §1.1 `DeleteDeviceOutcome` | `src/lib/data/types.ts:207` | |
| §1.2 `createDevice` | `src/lib/data/mock/devices.ts:42`, `src/lib/data/prisma/devices.ts:32` | |
| §1.2 `updateDevice` | `src/lib/data/mock/devices.ts:75`, `src/lib/data/prisma/devices.ts:37` | |
| §1.2 `assignDeviceToSeat` | `src/lib/data/mock/devices.ts:111`, `src/lib/data/prisma/devices.ts:43` | |
| §1.2 `unassignDevice` | `src/lib/data/mock/devices.ts:136`, `src/lib/data/prisma/devices.ts:52` | |
| §1.2 `designatePrimaryDevice` | `src/lib/data/mock/devices.ts:166`, `src/lib/data/prisma/devices.ts:57` | Device id only, no seat id, as specified. |
| §1.2 `deleteDevice` | `src/lib/data/mock/devices.ts:211`, `src/lib/data/prisma/devices.ts:62` | |
| §1.2 rule 1 — duplicate tag refused; `id` minted; `seatId: null`, `rank: "SECONDARY"` | `src/lib/data/mock/devices.ts:43-56` | The two literals are written rather than spread from `input`, and `NewDevice` has no field for either, so no caller can supply one. |
| §1.2 rule 2 — `updateDevice` writes neither `seatId` nor `rank`; refuses a duplicate against any *other* device; refuses the INV-05 owner change and writes nothing at all | `src/lib/data/mock/devices.ts:76-95` | Every check precedes the first write. AC-11 asserts the device is unchanged, not that only the owner is. |
| §1.2 rule 3 — assign forces SECONDARY, touches no other row | `src/lib/data/mock/devices.ts:115-121` | |
| §1.2 rule 4 — unassign clears `seatId`, forces SECONDARY unconditionally, deletes nothing, leaves `ownerId` | `src/lib/data/mock/devices.ts:137-142` | |
| §1.2 rule 5 — four refusals in the specified order | `src/lib/data/mock/devices.ts:167-181` | `NOT_FOUND`, `NOT_ASSIGNED`, `SEAT_HAS_NO_OCCUPANT`, `OWNER_IS_NOT_OCCUPANT`, in that order and no other. |
| §1.2 rule 6 — demote before promote, no await between | `src/lib/data/mock/devices.ts:183-192` | The incumbent search excludes the target, so designating an already-primary device demotes nothing. |
| §1.2 rule 7 — delete removes one row, reads `wasPrimaryOfSeatId` first | `src/lib/data/mock/devices.ts:212-217` | No seat, member or other device is read or written. |
| §1.3 every schema | `src/lib/validation/device.ts:22-62` | Verbatim from the design, with `deviceRankSchema` kept beside them — see *Deviations*. |
| §1.3 "no owner chosen" refused by `.min(1)` against `value=""` | `src/lib/validation/device.ts:31`, `src/app/(app)/devices/devices-manager.tsx:462,517` | No `required` attribute is relied on anywhere. |
| §1.4 error kinds and result type | `src/actions/devices.ts:28-53` | `REFUSED`, not `INVARIANT`, for the reason §1.4 gives. |
| §1.4 `createDevice` | `src/actions/devices.ts:125` | |
| §1.4 `updateDevice` | `src/actions/devices.ts:156` | |
| §1.4 `assignDevice` | `src/actions/devices.ts:187` | |
| §1.4 `unassignDevice` | `src/actions/devices.ts:204` | |
| §1.4 `designatePrimaryDevice` | `src/actions/devices.ts:224` | |
| §1.4 `deleteDevice` | `src/actions/devices.ts:260` | |
| §1.4 the reason-to-error mapping table | `src/actions/devices.ts:58-61, 131-134, 165-177, 194-196, 211, 231-241, 267` | Both INV-05 messages are the same sentence from one constant; the seam's reason codes stay distinct. |
| §1.4 five-step body, `revalidatePath("/devices")` last | every action in `src/actions/devices.ts` | Step 3 is the absent permission check, commented at the line it will occupy. |
| §1.5 `DevicesPage` | `src/app/(app)/devices/page.tsx:45` | Four existing reads in one `Promise.all`, no new seam function. |
| §1.5 `DeviceRow`, `MemberOption`, `SeatOption` | `src/app/(app)/devices/page.tsx:14,24,29` | Declared in `page.tsx`, where the design's §1.5 listing places them. `devices-manager.tsx` takes them with `import type`, which erases. |
| §1.5 `DevicesManager` | `src/app/(app)/devices/devices-manager.tsx:96` | Holds no copy of the list; every write ends in `router.refresh()`. |
| §1.5 row-control table | `src/app/(app)/devices/devices-manager.tsx:368-435` | Edit, Make primary and Delete always; Assign only when `seatId === null`; Unassign only when it is not. |
| §2 permission model | `src/actions/devices.ts:118-124, 161-162, 191-192, 208-209, 229-232, 264-266` | No gate on any operation. `PermissionGate` is not imported anywhere in this ticket's files; `can()` and `ROLE_RANK` are not called; `src/lib/auth/**` is untouched. |
| §3 seam impact | three files, exactly the three named | `mock/store.ts`, `mock/seats.ts`, `mock/members.ts`, `mock/rooms.ts` and `fixtures.ts` are unmodified. |
| §6 testability contract | see the table below | All 45 selectors present. |

## Deviations from the design

Two, both small, both declared, and neither changes a signature or a behaviour the contract names.

**D-1 — `src/actions/devices.ts` and `src/lib/validation/device.ts` are described in the design as
"(new file)" and both already existed.** They are Phase B scaffolds, tracked at `0d651f7`. The
design's §5 lists them under `allowed_paths` either way, so nothing was written out of scope, but a
reviewer diffing intent against code will see `modified` where the design says `created`.

What that meant in practice, and what was done about it:

- `src/lib/validation/device.ts` held `deviceRankSchema` and a `createDeviceSchema` of a different
  shape — one that collected `seatId` and `rank` and allowed a null `ownerId`. **`createDeviceSchema`
  and `CreateDeviceInput` are replaced**, because §1.3 specifies them and the two shapes cannot both
  exist under one name. **`deviceRankSchema` is kept** (`src/lib/validation/device.ts:13`): nothing
  in this ticket asks for it to go, it was not written by DEV-01, and *additive only* says not to
  delete a file's contents that this run did not create.
- `src/actions/devices.ts` held `getDevices()` and `getUnassignedDevices()`. **Both are kept**
  (`src/actions/devices.ts:116,121`), unchanged, beside the six new write actions. §1.2 leaves the
  three existing seam reads untouched and these are their action-layer callers.

Both restorations were made after the first write of those files and before the gate was run, so the
diff a reviewer sees is additive with one specified replacement. Recorded here rather than left to be
found, because "the design said new and the file was not" is the kind of thing that reads as scope
growth in a diff and is not.

**D-2 — `src/app/(app)/devices/page.tsx` was replaced, not extended.** §5 authorises this in terms:
the file is a Phase B read-only scaffold, it is in `allowed_paths`, and the route is the one the
story's surface belongs on. Named here anyway so the *additive only* working agreement has an
explicit exception recorded against it rather than an implicit one.

Nothing else. No field name appears in the code that did not appear in the contract first (RULE-04),
no seam function was added beyond the six, and no consultation was opened — `consulted` is empty and
`chat_budget` is untouched at 0 used on all four pairs.

## Invariants

| ID | Still holds because |
|----|---------------------|
| `INV-04` — a seat has at most one primary device | Every path that could produce a second PRIMARY row on one seat is closed in `src/lib/data/mock/devices.ts`, and all four are closures on a *write*, not on an affordance. `designatePrimaryDevice:183-192` demotes the incumbent and promotes the target with no await between them, so the two-primary state is never observable by another read. `assignDeviceToSeat:120` forces SECONDARY, so assignment can never mint a second primary — this is AC-5's last clause and it is why *Assign* is a different act from *Make primary*. `unassignDevice:141` forces SECONDARY, so a designation cannot outlive the seat it was made against. `designatePrimaryDevice:172` refuses `NOT_ASSIGNED`, so a PRIMARY row with no seat cannot exist at all. `updateDevice` cannot reach `rank` because `DevicePatch` has no field for it. **This is weaker than a constraint and it is the only mechanism**: `one_primary_device_per_seat` is out-of-scope item 6 and there is no database under `DATA_SOURCE=mock`. Verified end to end against a running production build — designating a second device on `SEAT-A-02` left exactly one PRIMARY and demoted `AST-0003` to SECONDARY. |
| `INV-05` — a seat's primary device must be owned by that seat's occupant | Guarded in both directions, in the same module, by refusals rather than by a filtered picker. Designation moving, owner still: `designatePrimaryDevice:174-181` refuses `SEAT_HAS_NO_OCCUPANT` when `seat.occupantId === null` and `OWNER_IS_NOT_OCCUPANT` when the owner differs — in that order, so a null occupant is never reported as a mismatch and AC-8 and AC-10 stay distinguishable. Owner moving, designation still: `updateDevice:85-90` refuses `PRIMARY_OWNER_MUST_BE_OCCUPANT` and writes nothing at all, so a rejected owner cannot leave a saved model behind. The owner picker is deliberately **not** filtered to the occupant (§7 alternative B): a list that omits a row is not a check, because the action can be invoked without the list. Both refusals verified against a running build, with the two-move walk AC-11 exists to catch — designate legally, then attempt to move the owner away — refused at the second move. |
| `INV-06` — on occupant exit, the primary auto-downgrades to secondary | DEV-01's obligation is negative and is discharged, not implemented: this ticket builds no occupant-exit path and writes nothing on a seat. `src/lib/data/mock/seats.ts` and `fixtures.ts` are untouched, and no function added here reads or writes `Seat.occupantId` other than to compare it. What it must not do is create a state the downgrade could not act on, and two rules prevent that. The designation lives in `Device.rank` keyed by `Device.seatId`, which is where an occupant-exit path will look for it, and `unassignDevice:140-141` clears both together so a designation is never orphaned from its seat. `SEAT_HAS_NO_OCCUPANT` is the other half: a primary on an unoccupied seat is a row the downgrade would have nothing coherent to fire on, and it cannot be created. `deleteRoom` in `mock/rooms.ts`, the one exit path that exists, is unchanged. |
| `INV-07` — devices may exist unassigned in inventory | Held by `Device.seatId` being nullable and by two writes that use it. `createDevice:52` makes inventory the state a device is born into; `unassignDevice:140` makes it the state a device returns to, and the row survives — which is the whole difference between unassigning and deleting. `deleteDevice` is the only function in this ticket that removes a row, and it is reachable only behind a confirmation. The surface carries the same distinction: *Unassign* and *Delete* are separate controls and only the second is confirmed. `AST-0005`, the seeded ownerless unassigned device, renders `unowned` / `unassigned` / `n/a` / `n/a` and is a normal row, not a broken one — verified against a running build. |

No invariant violation was found. Nothing escalates under RULE-07.

## Verification run

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | `tsc --noEmit`, clean. |
| `pnpm lint` | 0 | `eslint .`, clean. No `no-restricted-imports` violation: nothing added here names `@/lib/data/prisma/**`. |
| `pnpm test` | 0 | 3 files, 45 tests. `tests/unit/seam-parity.test.ts` passes with the six new names on both sides at matching arity — it is the check that the Prisma stubs were not forgotten, and it is not editable by this ticket. |
| `pnpm build` | 0 | `next build` compiles and prerenders `/devices`. Run because §1.4 leans on `revalidatePath` and §6.2 says the e2e suite runs against a production build, so a build-only failure would surface at QA and not here. The two Better Auth warnings are pre-existing and unrelated. |
| `git diff --name-only` subset of `allowed_paths` | yes | The seven files above. Other paths are dirty in this working tree — `.ai/registry/**`, `.ai/00-charter.md`, `.ai/standards/architecture.md`, `.ai/templates/idea.md`, `.claude/**`, `CLAUDE.md`, `.ai/board/metrics.md` — and **none of them was written by this stage**; they changed underneath it during the run, and `ADR-004-file-write-guards-removed.md` is new in the tree and explains why the guards did not intervene. R1 diffs `origin/main...HEAD`, so this is worth knowing before that check is read. |
| ad-hoc e2e, 11 scenarios, scratch files outside the repo | 11/11 | See below. |

**The ad-hoc run, and why it exists.** The gate for this stage is typecheck and lint, and neither
exercises a single one of the seven contract rules. `tests/**` belongs to QA (§5), so the check was
run from a scratch directory outside the repository against `next start` on port 3101 with
`DATA_SOURCE=mock`, and deleted afterwards. **No file under `tests/` was created, modified, or read
for this.** It is not a substitute for the QA gate and no artifact of it survives; it is the
difference between reporting that the contract is implemented and knowing it.

What it covered, all against the seeded store through the UI: AC-1 (owner, seat, rank and occupant
cells, including `AST-0005`'s `unowned` / `unassigned` / `n/a` / `n/a`), AC-2, AC-3 (three messages
from one blank submission), F-1's duplicate-tag refusal against the tag field, AC-4, AC-5, AC-7's
demotion, AC-8, AC-9, AC-10, AC-11's refusal against the owner select, AC-12, AC-13's seat-naming
confirmation and its `SECONDARY`-intact control device, and AC-14's cancel-performs-nothing. Eleven
scenarios, eleven passing. One scenario failed on its first run and the cause was the scratch test
clicking *Delete* before `router.refresh()` had landed after *Unassign*, so the confirmation named
the seat the row had a moment earlier; re-run with the wait, it passes. That is a property of the
test, not of the surface — but see *Open questions* item 3, because it is a real window.

## Testability contract

All 45 selectors from §6. Three prefixes come from shared components and are reused rather than
redefined: `DataTable` at `src/app/(app)/devices/devices-manager.tsx:285` with
`testIdPrefix="devices"` emits `devices-table`, `devices-row-<assetTag>` and `devices-empty`;
`EntityFormDialog` at `:442`, `:476` and `:533` emits the `-dialog`, `-cancel` and `-submit` triple
for `device-create`, `device-edit` and `device-assign`.

Rows are keyed by `assetTag` — `devices-manager.tsx:290`.

| `data-testid` | Exists at |
|---------------|-----------|
| `devices-page` | `src/app/(app)/devices/page.tsx:87` |
| `devices-table` | `devices-manager.tsx:285` via `DataTable`, `testIdPrefix` at `:291` |
| `devices-empty` | `devices-manager.tsx:285` via `DataTable`; message at `:293` |
| `devices-row-<assetTag>` | `devices-manager.tsx:285` via `DataTable`; `rowKey` at `:290` |
| `devices-row-<assetTag>-tag` | `devices-manager.tsx:299` |
| `devices-row-<assetTag>-model` | `devices-manager.tsx:306` |
| `devices-row-<assetTag>-owner` | `devices-manager.tsx:315` — `unowned` when there is none |
| `devices-row-<assetTag>-seat` | `devices-manager.tsx:326` — `unassigned` when there is none |
| `devices-row-<assetTag>-rank` | `devices-manager.tsx:342` (`n/a`, unassigned) and `:348` (`PRIMARY`/`SECONDARY`) |
| `devices-row-<assetTag>-occupant` | `devices-manager.tsx:360` — `n/a`, `no occupant`, or the name |
| `devices-row-<assetTag>-edit` | `devices-manager.tsx:377` |
| `devices-row-<assetTag>-assign` | `devices-manager.tsx:393` — rendered only when `seatId === null` |
| `devices-row-<assetTag>-unassign` | `devices-manager.tsx:403` — rendered only when `seatId !== null` |
| `devices-row-<assetTag>-primary` | `devices-manager.tsx:420` — rendered on **every** row |
| `devices-row-<assetTag>-delete` | `devices-manager.tsx:432` |
| `devices-create-open` | `devices-manager.tsx:273` |
| `devices-action-error` | `devices-manager.tsx:280` — absent until a row action is refused |
| `device-create-dialog` | `devices-manager.tsx:442` via `EntityFormDialog`, prefix at `:448` |
| `device-create-tag` | `devices-manager.tsx:452` |
| `device-create-tag-error` | `devices-manager.tsx:453` |
| `device-create-model` | `devices-manager.tsx:457` |
| `device-create-model-error` | `devices-manager.tsx:458` |
| `device-create-owner` | `devices-manager.tsx:462` — placeholder `value=""` at `:465` |
| `device-create-owner-error` | `devices-manager.tsx:472` |
| `device-create-submit` | `devices-manager.tsx:442` via `EntityFormDialog` |
| `device-create-cancel` | `devices-manager.tsx:442` via `EntityFormDialog` |
| `device-edit-dialog` | `devices-manager.tsx:476` via `EntityFormDialog`, prefix at `:482` |
| `device-edit-tag` | `devices-manager.tsx:493` — pre-filled |
| `device-edit-tag-error` | `devices-manager.tsx:495` |
| `device-edit-model` | `devices-manager.tsx:504` — pre-filled |
| `device-edit-model-error` | `devices-manager.tsx:506` |
| `device-edit-owner` | `devices-manager.tsx:517` — pre-selected, or on the placeholder |
| `device-edit-owner-error` | `devices-manager.tsx:528` — carries AC-11's INV-05 refusal |
| `device-edit-submit` | `devices-manager.tsx:476` via `EntityFormDialog` |
| `device-edit-cancel` | `devices-manager.tsx:476` via `EntityFormDialog` |
| `device-assign-dialog` | `devices-manager.tsx:533` via `EntityFormDialog`, prefix at `:539` |
| `device-assign-seat` | `devices-manager.tsx:548` — placeholder `value=""` at `:550` |
| `device-assign-seat-error` | `devices-manager.tsx:557` |
| `device-assign-submit` | `devices-manager.tsx:533` via `EntityFormDialog` |
| `device-assign-cancel` | `devices-manager.tsx:533` via `EntityFormDialog` |
| `device-delete-dialog` | `devices-manager.tsx:566` |
| `device-delete-message` | `devices-manager.tsx:569` |
| `device-delete-seat` | `devices-manager.tsx:581` — a bare seat code, `none` when unassigned |
| `device-delete-confirm` | `devices-manager.tsx:597` |
| `device-delete-cancel` | `devices-manager.tsx:587` |

The seat picker's option label is `<SEAT-CODE> (<ROOM-CODE>) — <occupant>`, built at
`devices-manager.tsx:91`, with `no occupant` for a vacant seat. It is contractual, not presentation:
it is the whole mechanism by which AC-7, AC-8 and AC-10 become constructible without any artifact
reaching QA having disclosed the seed. The owner picker's label is the member's full name.

**5 — the IN_PROGRESS pass is recorded as a comment in `ticket.yaml`, not as a fifth gate key.**
`.ai/templates/ticket.yaml` defines exactly four — `spec`, `design`, `review`, `qa` — and
`.claude/commands/ship.md` checks "all four gates". An `impl:` key was written and then removed
rather than left as an invented schema field. This document's front matter `gate: PASS` is the
stage's record. Recorded so the reviewer does not read the missing key as a missing gate.

## Open questions

**1 — `tests/e2e/smoke.spec.ts:57` is now broken and this stage deliberately did not repair it.**
It asserts `devices-row-dev-05`; rows are keyed by `assetTag`, so the row is `devices-row-AST-0005`.
The design predicted this exactly, put the file in `allowed_paths` for it, and assigned the repair:
"The repair is QA's, because `tests/**` is QA's" (§5). One selector string changes and no behaviour
does — the INV-07 assertion it carries still holds, because the seat cell still renders the literal
`unassigned`, which was confirmed against a running build. **`pnpm test:e2e` will fail on that one
line until QA changes it.** Flagged loudly because a reviewer running the e2e suite will hit it and
it is not a defect in this implementation.

**2 — F-1 to F-5 are still open and are now the only thing between this ticket and `/qa`.** None
blocked this stage and none was answered here; `99-questions.md` routes all five to `ba` and RULE-14
is the mechanism. F-1 is the one with teeth: the duplicate-tag refusal exists in the code
(`mock/devices.ts:43`, `actions/devices.ts:131`) and in §6 (`device-create-tag-error`), and no
acceptance criterion names it, so QA cannot write a test for it without inventing one (RULE-05).

**3 — A second row control pressed before `router.refresh()` lands reads the previous render's
row.** Concretely: press *Unassign*, then press *Delete* fast enough, and the confirmation names the
seat the device had a moment ago, because `deleteTarget` is the `DeviceRow` prop as it stood at the
click. The write itself is correct — the action re-reads the device by id at the seam — so nothing
illegal is written and no criterion is violated; what is stale is one line of confirmation text.
`pending` disables *Unassign* and *Make primary* while an action is in flight but is cleared when
the action resolves, which is before the refresh has re-rendered, and *Edit* and *Delete* are not
disabled by it at all. **This is inherited from `rooms-manager.tsx` unchanged**, where §7 of
`ROO-01`'s design records the same staleness for `seatCount`, and this ticket's design does not
mention it. Left as it is rather than diverging from the established pattern on the Developer's own
judgement. Worth a decision at review: either it is accepted for both surfaces or it is a defect in
both, and it should not be answered differently for devices than for rooms.

**4 — `DeviceRow`, `MemberOption` and `SeatOption` live in `page.tsx`, where §1.5 places them, and
the client component imports them from there.** `import type` is erased under `verbatimModuleSyntax`,
so no runtime import of a server component's module exists and the build confirms it. Noted because
a client component importing from a `page.tsx` reads like a mistake at a glance and is not one —
`ROO-01` went the other way round, declaring `RoomRow` in the manager. If the reviewer prefers that
shape for consistency it is a two-line move, and it is a design question rather than a code one.
