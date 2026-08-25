---
ticket: MEM-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-23T10:01:29Z
inputs_read: [ .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/02-design.md, .ai/board/tickets/MEM-01/03-impl-log.md, .ai/board/tickets/MEM-01/ticket.yaml, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/01-operating-model.md, .ai/templates/review-report.md, .ai/steward/context.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# MEM-01 — Member CRUD UI — review report

**A FOURTH PASS was run at 2026-08-24T08:53:00Z, after design version 4 and the F-9 rework cycle added section 1.6 (`export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx`). It is at the foot of this file and it is the one that governs: it is the only pass that judged the version 4 implementation. Passes 1, 2 and 3 are kept as the record.**

**A THIRD PASS was run at 2026-08-24T02:25:39Z, after design version 2 and the F-6 rework cycle changed the code. Passes 1 and 2 judged version 1 and are kept as the record.**

**A SECOND PASS was run at 2026-08-24T01:49:06Z in a new session and is appended at the foot of this file. The front-matter above is pass 1's, is left exactly as written, and is not superseded — but `next_state: QA` was true of pass 1 and is not true today. Pass 2's own front-matter block carries the current one.**

Nine checks, nine citations, no finding. The verdict is `PASS` and the ticket advances to QA.

This session was fresh, read files only, and had no message channel to the Developer or to any other
agent (RULE-13). `chat_before_verdict: none` is true as written, not asserted.

Three checks were verified by **execution against the shipped code** rather than by reading it — R8's
INV-12 mechanism, R8's INV-08 mechanism, and the schema ordering design 1.3 calls load-bearing. The
Developer claims all three in `03-impl-log.md`; a reviewer that accepts a claim because it is written
down has checked the log and not the code. The transcripts are quoted below.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Nine paths in the diff; eight source files plus `ticket.yaml`, each matched to a `ticket.yaml:allowed_paths` entry — table in *R1 detail*. `.ai/board/metrics.md` is the tenth and is not this ticket's, evidenced there |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, exit `0`, no diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, exit `0`, no output, no warnings |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `src/app/(app)/members/page.tsx:4` and `:5` import `@/lib/data`; `members-manager.tsx:34` imports types from `@/lib/data`; `src/actions/members.ts:17-18` the same. `grep -rn "prisma\|PrismaClient\|@prisma/client" src/app src/components` returns exactly one line — `page.tsx:38`, inside a comment naming `prisma/schema.prisma` as the file where `authUserId` is absent |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | 43 items, each cited in *R5 detail* |
| R6 | Permission gating matches design section 2 | **PASS** | `src/actions/members.ts:111, 137, 172, 192` — four absent checks, each commented at the line where the check belongs. No `PermissionGate` import, no `can()` call, no `ROLE_RANK` read in any ticket file; the four grep hits are all comments — *R6 detail* |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | All 41 located, 0 missing — table in *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | INV-08 and INV-12 reasoned individually and verified by execution — *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `git status --porcelain package.json pnpm-lock.yaml` is empty and `git diff --name-only origin/main...HEAD -- package.json pnpm-lock.yaml` is empty. No import in any ticket file names a package that was not already a dependency: `zod` (`src/lib/validation/member.ts:1`), `next/cache` (`src/actions/members.ts:15`), `next/navigation` and `react` (`members-manager.tsx:15-17`) |

## R1 detail

The working tree holds more than one body of work, which `.ai/01-operating-model.md` describes as the
normal state — every stage leaves the tree dirty and `/ship` classifies it. R1 is therefore read
against the diff **attributable to this ticket**, and the one other path was opened and confirmed to
carry none of it. This is the same reading `DEV-01`'s R1 took at `04-review.md`.

| Path in the diff | `allowed_paths` entry | Evidence it is this ticket's |
|---|---|---|
| `src/lib/data/types.ts` | `src/lib/data/types.ts` | Six added types, `types.ts:108, 124, 131, 135, 152, 164`; `Member` at `:91-97` unmodified |
| `src/lib/data/mock/store.ts` | `src/lib/data/mock/store.ts` | One added binding, `store.ts:53`; the diff touches only the import statement and that export |
| `src/lib/data/mock/members.ts` | `src/lib/data/mock/members.ts` | Four write/read functions, `:46, 77, 106, 135`, plus `referencesTo` at `:152` |
| `src/lib/data/prisma/members.ts` | `src/lib/data/prisma/members.ts` | Four `notWired` stubs, `:26, 31, 37, 42` |
| `src/lib/validation/member.ts` | `src/lib/validation/member.ts` | Schemas, `:10, 21, 31, 40, 42, 52, 60` |
| `src/actions/members.ts` | `src/actions/members.ts` | Four actions, `:107, 133, 166, 186` |
| `src/app/(app)/members/page.tsx` | `src/app/(app)/members/page.tsx` | `MembersPage` at `:44`, `MemberRow` at `:16` |
| `src/app/(app)/members/members-manager.tsx` | `src/app/(app)/members/members-manager.tsx` | New file, `MembersManager` at `:100` |
| `.ai/board/tickets/MEM-01/ticket.yaml` | `.ai/board/tickets/MEM-01/**` | State and gate bookkeeping |

**`.ai/board/metrics.md` is in the diff and is not in `allowed_paths`. It is not this ticket's
implementation, and it is not chargeable to the Developer.** The diff is a single added line — the
`ba` ledger row for MEM-01's SPEC gate, timestamped `2026-08-23T09:19:29Z`, which is the same
timestamp `ticket.yaml:gates.spec.at` carries. It was written at SPEC, twenty-three minutes before
DESIGN and thirty-three before the IN_PROGRESS log at `03-impl-log.md:6`. Its text describes the
resolution of `Q-1` and names no identifier this implementation introduces; `grep` for
`MembersManager`, `MemberRow`, `NewMember`, `MemberPatch`, `MemberReferences`,
`getMemberReferences` and `members-manager` across it returns nothing.

Worth stating as evidence rather than as a comment, because it decides the verdict rather than
decorating it: **`metrics.md` is in no ticket's `allowed_paths`** — not MEM-01's, not `DEV-01`'s at
`ticket.yaml:67-78`, not `ROO-01`'s — while the orchestrator loop in `.ai/01-operating-model.md`
requires every stage transition to append to it. Read literally against the whole working tree, R1
would fail by construction on every ticket the moment its own ledger row was written, and the failure
would route to the `developer` and burn a RULE-06 budget under RULE-08 for a write the Developer did
not make and cannot revert without destroying the ledger. The diff attributable to this ticket is the
nine rows above, and it is a subset.

**What this PASS is worth, stated rather than assumed.** Per ADR-004 `guard-allowed-paths.mjs` is
unwired, and `scripts/check-allowed-paths.mjs:82-85` exits 0 on any branch not named `feat/*` (MD-09).
This session is on `feat/MEM-01`, so the CI script would run — but `scripts/check-allowed-paths.mjs:108`
computes `origin/main...HEAD`, and `02-design.md` section 0 records that `55054cb` is unmerged, so
that diff currently carries the registry commit and the DEV-01 ledger backfill as well. **Until the
ops branch reaches `main`, this path-by-path reading is the only enforcement of RULE-03 that will have
run on this ticket.** That is the ordering consequence the design routed to a human, not a defect in
this implementation, and it is why the table above was verified file by file rather than asserted.

## R5 detail

Design section 1, item by item. Every signature was compared against the design text character by
character, not summarised.

### 1.1 — seam DTOs (`src/lib/data/types.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `NewMember` — `fullName`, `email`, `role` | `src/lib/data/types.ts:108-112` | Yes. Three fields, no `groupId`, no default on `role` |
| `MemberPatch` — `fullName`, `email`, `role` | `src/lib/data/types.ts:124-128` | Yes |
| `CreateMemberOutcome` | `src/lib/data/types.ts:131-133` | Yes. Two arms, `DUPLICATE_EMAIL` |
| `UpdateMemberOutcome` | `src/lib/data/types.ts:135-137` | Yes. `NOT_FOUND \| DUPLICATE_EMAIL` |
| `MemberReferences` — `occupiedSeatCodes`, `ownedDeviceCount` | `src/lib/data/types.ts:152-155` | Yes |
| `DeleteMemberOutcome` | `src/lib/data/types.ts:164-167` | Yes. Three arms, no `cascaded` branch |
| "No existing type is modified" (the XL test) | `Member` at `src/lib/data/types.ts:91-97` | Yes. `git diff src/lib/data/types.ts` is additive; `Seat`, `Device`, `Account`, `Group` untouched |

### 1.2 — seam functions

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `listMembers(): Promise<Member[]>` unchanged | `src/lib/data/mock/members.ts:19` | Yes |
| `getMember(id): Promise<Member \| null>` unchanged | `src/lib/data/mock/members.ts:23` | Yes |
| `createMember(input: NewMember): Promise<CreateMemberOutcome>` | `src/lib/data/mock/members.ts:46` | Yes |
| `updateMember(id, patch: MemberPatch): Promise<UpdateMemberOutcome>` | `src/lib/data/mock/members.ts:77` | Yes |
| `getMemberReferences(id): Promise<MemberReferences \| null>` | `src/lib/data/mock/members.ts:106` | Yes |
| `deleteMember(id): Promise<DeleteMemberOutcome>` | `src/lib/data/mock/members.ts:135` | Yes |
| Prisma parity, same names and arity, each `notWired` | `src/lib/data/prisma/members.ts:26, 31, 37, 42` | Yes. Parameters `void`-discarded at `:27, 32-33, 38, 43` so arity cannot drift. `pnpm test` → 4 files, 61 tests, exit `0`, `seam-parity.test.ts` passing unedited |
| Rule 1 — duplicate `email` refused, exact not case-folded; mints `id`; writes `groupId: null`; writes nothing outside members | `src/lib/data/mock/members.ts:47-49, 51-59` | Yes. Verified by execution: `dup exact -> {"created":false,"reason":"DUPLICATE_EMAIL"}`, `dup cased -> created: true`, `created groupId=null` |
| Rule 2 — duplicate refused against any *other* member; writes three fields; writes nothing on refusal | `src/lib/data/mock/members.ts:81-83, 85-87` | Yes. Both checks precede the first assignment. Verified: `self email update -> updated: true` and `dup update -> DUPLICATE_EMAIL` with `unchanged after refusal: true` |
| Rule 3 — `null` for a member that does not exist; both halves always; pure read | `src/lib/data/mock/members.ts:107-108`, `:152-158` | Yes. Verified: `getMemberReferences("nope") -> null` |
| Rule 4 — `deleteMember` computes references itself | `src/lib/data/mock/members.ts:139` calls `referencesTo` at `:152` | Yes. One predicate, called by both `:108` and `:139`, so the read and the enforcement cannot drift |
| Rule 5 — refuses `REFERENCED` when either half is non-empty, carrying both; writes nothing on refusal | `src/lib/data/mock/members.ts:140-142` | Yes. The `return` at `:141` precedes the only mutation, `:144` |
| Rule 6 — removes exactly one row, no cascade, carries the F-4 comment | `src/lib/data/mock/members.ts:144`, comment at `:120-130` | Yes. `splice(indexOf, 1)`; the comment names all three declarations with their `prisma/schema.prisma` lines and the condition that makes them live |

### 1.3 — Zod schemas (`src/lib/validation/member.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `memberFullNameSchema` — `.trim().min(1).max(120)` | `src/lib/validation/member.ts:10` | Yes, messages included |
| `memberEmailSchema` — `.trim().min(1).email().max(254)`, in that order | `src/lib/validation/member.ts:21-26` | Yes. Order verified by execution, below |
| `memberRoleSchema` — `z.enum(["USER","MANAGER","ADMIN"])` | `src/lib/validation/member.ts:31` | Yes |
| `memberIdSchema` | `src/lib/validation/member.ts:40` | Yes |
| `createMemberSchema` — three fields | `src/lib/validation/member.ts:42-46` | Yes. The scaffold's `groupId` is gone |
| `updateMemberSchema` — `id` plus three | `src/lib/validation/member.ts:52-57` | Yes |
| `memberIdOnlySchema` | `src/lib/validation/member.ts:60` | Yes |
| `CreateMemberInput`, `UpdateMemberInput` | `src/lib/validation/member.ts:62-63` | Yes |
| "No role chosen" refused via an empty-valued placeholder, no `required` attribute relied on | `members-manager.tsx:397` and `:462`; no `required` on either `Select` | Yes |

Executed against the shipped schemas:

```
blank all      -> fullName:A name is required. | email:An email address is required. | role:Invalid option: expected one of "USER"|"MANAGER"|"ADMIN"
whitespace     -> fullName:A name is required. | email:An email address is required. | role:Invalid option: ...
banana email   -> email:That is not a valid email address.
valid          -> OK
unknown key stripped -> {"fullName":"A","email":"a@b.internal","role":"USER"}
```

The last line is R8's evidence as well as R5's: `password` and `groupId` were both supplied and both
stripped.

### 1.4 — server actions (`src/actions/members.ts`)

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `MemberFieldName` | `src/actions/members.ts:25` | Yes |
| `MemberActionError` — four kinds | `src/actions/members.ts:35-39` | Yes. `REFERENCED` carries `references` and no message string |
| `MemberActionResult<T>` | `src/actions/members.ts:41-43` | Yes |
| `createMember(input: unknown): Promise<MemberActionResult<Member>>` | `src/actions/members.ts:107` | Yes |
| `updateMember(input: unknown): Promise<MemberActionResult<Member>>` | `src/actions/members.ts:133` | Yes |
| `getMemberReferences(input: unknown): Promise<MemberActionResult<MemberReferences>>` | `src/actions/members.ts:166-168` | Yes |
| `deleteMember(input: unknown): Promise<MemberActionResult<{ id: string }>>` | `src/actions/members.ts:186-188` | Yes |
| Step 1 — `"use server"` | `src/actions/members.ts:1` | Yes |
| Step 2 — parse, map `issues` to `fields`, never return the raw `ZodError`, first message per field | `src/actions/members.ts:66-77` (`fieldErrors`), `:79-83`, and `:108-109, 134-135, 169-170, 189-190` | Yes. `:74` takes the first message per field, which is what makes 1.3's ordering matter |
| Step 3 — permission check absent, comment at the line where it belongs | `src/actions/members.ts:111, 137, 172, 192` | Yes — R6 |
| Step 4 — `DUPLICATE_EMAIL` → field message | `src/actions/members.ts:89-94`, used at `:123` and `:151` | Yes, `"That email address is already in use."` at `:45` |
| Step 4 — `REFERENCED` → passed through unchanged | `src/actions/members.ts:199` | Yes. `references: outcome.references`, no re-shaping |
| Step 4 — `NOT_FOUND`, or `getMemberReferences` returning `null` | `src/actions/members.ts:85-87`, used at `:150, 177, 198` | Yes. `:177` is the `null` case, mapped to the same error |
| Step 5 — `revalidatePath("/members")` on the three write actions | `src/actions/members.ts:125, 154, 202` | Yes |
| Step 5 — `getMemberReferences` does **not** revalidate | `src/actions/members.ts:166-180` | Yes. No `revalidatePath` call in the body |

### 1.5 — UI components

| Contract item | Implemented at | Matches signature |
|---|---|---|
| `MembersPage(): Promise<JSX.Element>`, server component, default export | `src/app/(app)/members/page.tsx:44` | Yes |
| `MemberRow` — `member`, `occupiedSeatCodes`, `hasAccount` | `src/app/(app)/members/page.tsx:16-22` | Yes |
| `MembersManager({ rows }: { rows: MemberRow[] }): JSX.Element`, client component | `members-manager.tsx:100`, `"use client"` at `:1` | Yes |
| The three existing reads, in one `Promise.all`, no new seam function | `src/app/(app)/members/page.tsx:45-49` | Yes |
| **No `devices` import in `page.tsx`** | `src/app/(app)/members/page.tsx:4` imports `accounts, members, seats` only | Yes |
| Four dialogs, the pending flag, the last error per surface | `members-manager.tsx:103-114`; dialogs at `:374, 417, 474, 509` | Yes |
| Keeps no copy of the list; calls the action then `router.refresh()` | `members-manager.tsx:144, 164, 216`; `rows` is a prop at `:100` | Yes |
| Two-branch delete, chosen before anything is confirmed | `members-manager.tsx:176-194` | Yes. `:189` branches on either half; `:190` opens the refusal, `:193` the confirmation |
| `NOT_FOUND` on the request path renders the message and opens nothing | `members-manager.tsx:183-186`, rendered at `:268-272` | Yes |
| The refusal dialog has no confirm control | `members-manager.tsx:509-549` | Yes. One `Button`, `member-delete-refused-dismiss` at `:543` |
| The Sign-in column reads `Account` | `page.tsx:48, 51, 67`; rendered at `members-manager.tsx:333-335` | Yes |
| Row controls Edit and Delete on every row, unconditionally | `members-manager.tsx:346-369` | Yes. Neither is wrapped in a condition |

### 3 — seam impact, which section 1 depends on

| Contract item | Implemented at | Matches |
|---|---|---|
| `store.ts` gains one binding and no other line changes | `src/lib/data/mock/store.ts:53` | Yes. `git diff` touches the import at `:33-38` and the export at `:47-53`; nothing else |
| `mock/members.ts` repoints `members` to `./store` and gains `seats`, `devices` | `src/lib/data/mock/members.ts:17` | Yes |
| `accounts` and `requests` deliberately not added to the store | `src/lib/data/mock/store.ts` exports `rooms, seats, devices, members` only | Yes |
| `fixtures.ts`, `mock/seats.ts`, `mock/devices.ts`, `mock/accounts.ts` untouched | `git status --porcelain` lists none of them | Yes |

## R6 detail

Design section 2 states that no gate is enforced and that the correct R6 finding on this ticket is
that no gate exists and that the table says so. Checked against that table, not against an
expectation.

| Design section 2 requirement | Verdict | Citation |
|---|---|---|
| No permission gate on any of the seven operations | Holds | `src/actions/members.ts:107-204` — no session read, no role read, no comparison |
| `PermissionGate` is not used; no file in `allowed_paths` imports it | Holds | `grep` across the eight files returns one hit, `members-manager.tsx:10`, inside a comment saying it is not imported |
| `can()` and `ROLE_RANK` are not called; `src/lib/auth/permissions.ts` stays untouched | Holds | Three hits, all comments — `src/actions/members.ts:118`, `src/lib/validation/member.ts:28`, `members-manager.tsx:37`. `src/lib/auth/` is absent from `git status --porcelain` |
| Step 3 of all four actions carries a comment naming the rank check, out-of-scope item 1, the `AUT` group | Holds | `src/actions/members.ts:111-118, 137-141, 172-174, 192-194` |
| On the role path the comment names the unresolved `Q-3` | Holds | `src/actions/members.ts:139-141` — "`Q-3` asks whether a Manager may promote someone to ADMIN" |
| Controls rendered unconditionally | Holds | `members-manager.tsx:346-369` |

`ROLE_OPTIONS` at `members-manager.tsx:41` is a three-value array of `Role` used to render `<option>`
elements. It is a data question, not an authorization one — nothing in this ticket compares two roles
— which is exactly what design section 2 permits.

## R7 detail

All 41 selectors in design section 6 were parsed out of the design table and matched against the
rendered markup mechanically, then spot-checked by eye. **0 missing.** Six are emitted from a shared
component's prefix rather than written literally, and the emitting line is cited rather than the call
site.

| `data-testid` | Exists at |
|---|---|
| `members-page` | `src/app/(app)/members/page.tsx:71` |
| `members-table` | `src/components/shared/DataTable.tsx:29`, from `testIdPrefix="members"` at `members-manager.tsx:281` |
| `members-empty` | `src/components/shared/DataTable.tsx:25` → `EmptyState.tsx:3`, same prefix |
| `members-row-<email>` | `src/components/shared/DataTable.tsx:39`, `rowKey={(r) => r.member.email}` at `members-manager.tsx:280` |
| `members-row-<email>-name` | `members-manager.tsx:288` |
| `members-row-<email>-email` | `members-manager.tsx:296` |
| `members-row-<email>-role` | `members-manager.tsx:307` → `Badge.tsx:22` |
| `members-row-<email>-seats` | `members-manager.tsx:320` |
| `members-row-<email>-signin` | `members-manager.tsx:333` |
| `members-row-<email>-edit` | `members-manager.tsx:355` |
| `members-row-<email>-delete` | `members-manager.tsx:364` |
| `members-create-open` | `members-manager.tsx:262` |
| `members-action-error` | `members-manager.tsx:269`, guarded by `:268` so it is absent until an action fails |
| `member-create-dialog` | `EntityFormDialog.tsx:35`, `testIdPrefix="member-create"` at `members-manager.tsx:380` |
| `member-create-name` | `members-manager.tsx:384` |
| `member-create-name-error` | `members-manager.tsx:385` → `FieldError` at `members-manager.tsx:77` |
| `member-create-email` | `members-manager.tsx:389` |
| `member-create-email-error` | `members-manager.tsx:390` → `:77` |
| `member-create-role` | `members-manager.tsx:394` |
| `member-create-role-error` | `members-manager.tsx:404` → `:77` |
| `member-create-no-account` | `members-manager.tsx:411` |
| `member-create-submit` | `EntityFormDialog.tsx:42`, same prefix |
| `member-create-cancel` | `EntityFormDialog.tsx:39`, same prefix |
| `member-edit-dialog` | `EntityFormDialog.tsx:35`, `testIdPrefix="member-edit"` at `members-manager.tsx:423` |
| `member-edit-name` | `members-manager.tsx:434` |
| `member-edit-name-error` | `members-manager.tsx:436` → `:77` |
| `member-edit-email` | `members-manager.tsx:445` |
| `member-edit-email-error` | `members-manager.tsx:447` → `:77` |
| `member-edit-role` | `members-manager.tsx:456` |
| `member-edit-role-error` | `members-manager.tsx:469` → `:77` |
| `member-edit-submit` | `EntityFormDialog.tsx:42`, same prefix |
| `member-edit-cancel` | `EntityFormDialog.tsx:39`, same prefix |
| `member-delete-dialog` | `members-manager.tsx:478` → `Dialog.tsx:17` |
| `member-delete-message` | `members-manager.tsx:482` |
| `member-delete-confirm` | `members-manager.tsx:499` |
| `member-delete-cancel` | `members-manager.tsx:489` |
| `member-delete-refused-dialog` | `members-manager.tsx:513` → `Dialog.tsx:17` |
| `member-delete-refused-message` | `members-manager.tsx:516` |
| `member-delete-refused-seats` | `members-manager.tsx:528` |
| `member-delete-refused-devices` | `members-manager.tsx:534` |
| `member-delete-refused-dismiss` | `members-manager.tsx:543` |

Four properties section 6 promises QA, checked rather than assumed:

- **`Dialog.tsx:14` returns `null` when closed**, so `member-delete-dialog` and
  `member-delete-refused-dialog` are genuinely absent rather than hidden — a test asserting the
  refusal dialog did not open will not find a detached node.
- **`-seats` renders the literal `none` when empty and `-devices` renders a bare `0`** —
  `members-manager.tsx:529` and `:535`, through `seatCodeList` at `:65-67`. AC-11's Given can
  therefore assert `none` on one and a positive integer on the other in the same dialog.
- **The row cell and the refusal dialog share one renderer**, `seatCodeList` at
  `members-manager.tsx:65`, used at `:321` and `:529`, and both sources sort — `page.tsx:62` and
  `mock/members.ts:156`. AC-10's e2e Given reads the codes off the row and asserts them in the
  refusal; it cannot fail on a formatting or ordering difference between the two.
- **The role select renders exactly four options in both dialogs**, an empty placeholder plus the
  three `ROLE_OPTIONS` in `ROLE_RANK` order, value and label both the role string —
  `members-manager.tsx:397-402` and `:462-467`, `ROLE_OPTIONS` at `:41`.

## R8 detail

Two IDs in `ticket.yaml:invariants_touched`. Each is reasoned individually and each is verified at the
line that holds it. Neither is held by a UI affordance.

| Invariant | Held by | Citation |
|---|---|---|
| **INV-08** — there is no self-signup; accounts are created by Manager or Admin only | **The absence of a code path**, which is the form design section 3.1 specifies and the strongest form available. `NewMember` has three fields and none is a credential; `createMemberSchema` has the same three and strips unknown keys; `createMember` in the seam pushes one row onto the members collection and touches nothing else; `store.ts` does not export the accounts collection at all, so there is no binding a write could reach. Verified rather than read: `createMemberSchema.parse({..., password: "x", groupId: "g1"})` returns `{"fullName":"A","email":"a@b.internal","role":"USER"}` — both extra keys stripped. `grep` for `Account` across the eight ticket files returns five lines, of which the only executable ones are `page.tsx:48` (`accounts.listAccounts()`), `:51` and `:67` — a read and two derivations of the boolean the Sign-in column renders. **No write.** A password field added to the create form could not be wired to anything | `src/lib/data/types.ts:108-112`; `src/lib/validation/member.ts:42-46`; `src/lib/data/mock/members.ts:46-60`; `src/lib/data/mock/store.ts:36-53`; `src/app/(app)/members/page.tsx:48`; the form's standing statement at `members-manager.tsx:411` |
| **INV-12** — a Member may not be deleted while they occupy a seat or own a device; refused, not cascaded | **`deleteMember` in the mock seam, and nowhere else.** It calls `referencesTo` itself at `:139` rather than accepting a caller's word, refuses when **either** half is non-empty at `:140-142`, and that `return` precedes the only mutation in the function at `:144` — so the refusal path contains no write at all. The UI's two-dialog split is **not** the mechanism: `getMemberReferences` at `:106` only decides which dialog opens, and a caller reaching `src/actions/members.ts:186` directly is refused by the same predicate, because both call the one function at `:152` | `src/lib/data/mock/members.ts:135-146`, `:152-158`, `:106-109`; `src/actions/members.ts:196-200` |

**INV-12 verified by execution against the shipped mock store**, not by reading the code. Every seeded
member, then a constructed device-only case:

```
mem-admin:   refs={"occupiedSeatCodes":["SEAT-A-01","SEAT-A-04"],"ownedDeviceCount":2}  delete=REFERENCED (both halves carried)
mem-manager: refs={"occupiedSeatCodes":["SEAT-A-02"],"ownedDeviceCount":1}              delete=REFERENCED
mem-user:    refs={"occupiedSeatCodes":["SEAT-B-01"],"ownedDeviceCount":1}              delete=REFERENCED
members length after 3 delete attempts: 3
delete with nothing referencing:  {"deleted":true,...}
device-only refusal:              {"deleted":false,"reason":"REFERENCED","references":{"occupiedSeatCodes":[],"ownedDeviceCount":1}}
seats occupancy intact:           SEAT-A-01,SEAT-A-02,SEAT-A-04,SEAT-B-01
```

The sixth line is the one that matters, and it is the half `01-story.md` says a system enforcing
occupancy alone would let through: **no seat, one device, refused.** AC-10 and AC-11 fail
independently, as the story requires. The last line is AC-10's and AC-11's "no seat changes its
occupant" — occupancy is bit-identical after three refused deletes.

**INV-12's third clause — "the references are removed first" — is not implemented, and design section
3.1 is right that it cannot be here.** It describes the order of operations a person must follow, not
a write this ticket makes: releasing a seat is `SEA` and `REG`, reassigning a device is the device
surface. What MEM-01 owes the clause is the refusal that makes the ordering necessary plus a message
naming what to go and remove, and both exist — `members-manager.tsx:516-537`. That is not a violation
and does not escalate.

**INV-01, INV-05 and INV-06 were discharged by ADR-005 and stayed discharged.** `mock/members.ts`
imports `seats` and `devices` at `:17` and reads both — `filter`, `map`, `sort`, `length` at
`:153-157` — and assigns to neither. A grep for
`occupantId =`, `ownerId =`, `seatId =`, `rank =`, and for `push`/`splice`/`pop`/`shift`/`unshift` on
either array, across all eight ticket files, returns three lines and all three are `===` comparisons:
`mock/members.ts:154`, `:157`, `page.tsx:55`. That is the mechanical form of "MEM-01 writes nothing
under the device surface."

**INV-03** is not in `invariants_touched` and is worth one line because `01-story.md` predicted the
way it would be broken by a ticket that never intended to touch it: a cached occupancy summary stored
on the member row. There is none. `page.tsx:53-62` computes the map per render from `listSeats()`, and
`MemberRow.occupiedSeatCodes` at `:19` is a render-time projection, not a field on `Member` —
`types.ts:91-97` is unchanged.

**Under `DATA_SOURCE=mock` there is no database and no constraint, so this check is the only thing
verifying INV-12.** The same exposure `DEV-01` carries on INV-04 and INV-05. Stated so that the person
who applies the schema knows that `Seat.occupant` and `Device.owner` declaring `SetNull` — which
`02-design.md` section 4 records as a divergence from ADR-005 — has not yet been contradicted by
anything but this function.

## Findings

None. No check failed, so no row is routed and `rework_count` stays `0`.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | — | — | — |

**F-1, F-2 and F-3 are not review findings and are not this gate's to hold.** They are the design's,
raised at DESIGN against `01-story.md`, routed to `ba` in `99-questions.md`, and marked *blocks QA,
not IN_PROGRESS*. Three refusals now exist in the code with no criterion naming them — the duplicate
email on create (`mock/members.ts:47`) and on edit (`:81`), and the malformed email
(`src/lib/validation/member.ts:25`). R5 asks whether the design was implemented, and it was, exactly.
The amendment is owed before `/qa`, and the QA stage is where its absence bites, because QA may not
invent a criterion for a refusal it finds in the code.

## Verdict

**`PASS`.** Nine checks, nine citations, no finding. The ticket advances to `QA`.

Three things this review did not do, named so the next reader is not left inferring them. It did not
read `05-` or `06-`, which do not exist. It did not talk to the Developer, to `ba`, or to
`tech-lead-design`, and there was no channel by which it could have (RULE-13). And it did not judge
the four decisions `03-impl-log.md` records as left to the implementation — `referencesTo` being
private, `roleSchema` and `getMembers` surviving as scaffold exports, and a `REFERENCED` returned by
the confirm control reopening as the refusal dialog. Each was checked against design section 1 and
each falls inside what that section specifies rather than beside it; the fourth in particular is the
only presentation consistent with section 6, which assigns `member-delete-message` to AC-8 and AC-9
and warns QA against reading a refusal out of it.

---
---

# Pass 2 — 2026-08-24, re-run against a passed gate

```yaml
---
ticket: MEM-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-24T01:49:06Z
inputs_read: [ .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/02-design.md, .ai/board/tickets/MEM-01/03-impl-log.md, .ai/board/tickets/MEM-01/ticket.yaml, .ai/board/tickets/MEM-01/99-questions.md, .ai/registry/invariants.md, .ai/01-operating-model.md, .ai/templates/review-report.md, .ai/steward/context.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REWORK
---
```

`next_state` is **`REWORK`, not `QA`**, and that is the one place this pass departs from the `/review`
command's text. The reason is section *What this pass did not do to the board* below. R1 through R9
all pass; the ticket does not advance, because it is not in `REVIEW` and the two things holding it are
not this gate's.

This session was fresh, read files only, and had no message channel to the Developer or to any other
agent (RULE-13). `chat_before_verdict: none` is true as written. It did not open `05-test-plan.md`,
`06-test-report.md`, or the pass-1 checklist above before forming its own — pass 1 was read only at
the end, to write the *Agreement with pass 1* section, which is the only section that could not have
been written without it.

## Why there is a pass 2 at all, and what it is

**`MEM-01` is not in `REVIEW`.** `ticket.yaml:state` reads `REWORK` and `ticket.yaml:owner` reads
`ba`. The `review` gate passed at `2026-08-23T10:01:29Z`; QA then failed at `2026-08-23T10:31:00Z`
with three routed items, of which item 1 went to `ba` and items 2 and 3 to `tech-lead-design`. So
`/review MEM-01` today is a **re-run of a stage whose gate already passed**, not the re-review that
follows a REVIEW failure.

The model defines no re-run of a passed stage. The precedent in the ledger is
`.ai/board/metrics.md`'s `2026-08-23T07:09:56Z` row — `/spec DEV-01` re-run against a passed SPEC
gate, handled as *"a re-derivation from source, with the existing artifact judged against it rather
than overwritten"*. This pass follows it exactly:

- R1 through R9 were derived again from the current working tree, with no reference to pass 1.
- Nothing above the `---` `---` separator was edited, apart from one inserted pointer line under the
  title. Working agreement: additive only.
- **The gate is confirmed, not re-passed.** `gates.review.at` stays at `2026-08-23T10:01:29Z`.

Something did change between the passes, which is what makes the re-run more than ceremony: `ba`
amended `01-story.md` at `2026-08-24T01:36:50Z`, adding `AC-3a`, `AC-3b`, `AC-3c`, `AC-7a` and
`AC-7b`. Those five criteria name three refusals that pass 1 had to record as *implemented against a
design that specified them, with no criterion behind them* — the duplicate email on create and on
edit, and the malformed email. They now have criteria, and R5's coverage of them is no longer
contingent. The **code is unchanged** since pass 1; that was checked, not assumed, and the evidence
is in *R1 detail*.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Nineteen paths across tracked and untracked; eighteen matched to a `ticket.yaml:allowed_paths` entry, table in *R1 detail*. The nineteenth is `.ai/board/metrics.md`, whose two added rows name `ba` in their agent column at `metrics.md:33` and `:34` — not the Developer's write, and not chargeable here under RULE-08 |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, exit `0`, no diagnostics emitted |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, exit `0`, no output, no warnings |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `src/app/(app)/members/page.tsx:4-5` imports `@/lib/data`; `members-manager.tsx:34` imports types from `@/lib/data`; `src/actions/members.ts:17-18` the same. `grep -rn "prisma\|@prisma/client\|PrismaClient\|lib/data/prisma"` across the four non-seam ticket files returns three hits and all three are prose — `member.ts:7`, `member.ts:18`, `page.tsx:38`. Independently enforced: `eslint.config.mjs:28-31` restricts `@/lib/data/prisma/**` and `eslint.config.mjs:76-82` exempts only the seam's own directory, and R3 is green |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | 43 items, one row each in *R5 detail*, every row a `file:line` |
| R6 | Permission gating matches design section 2 | **PASS** | Design section 2 specifies **no gate**, plus a step-3 comment at the line where the check belongs. All four present: `src/actions/members.ts:111, 137, 172, 192`. No `PermissionGate` import, no `can()` call, no `ROLE_RANK` read anywhere in the ticket's files — the four grep hits are `member.ts:28`, `members.ts:118`, `members-manager.tsx:10` and `:37`, all comments. `src/lib/auth/` is clean in `git status --porcelain` |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | 41 of 41. 32 matched as string literals in the markup, 9 emitted from a `testIdPrefix` — *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | INV-08 and INV-12 reasoned individually and **verified by execution against the shipped seam**, not by reading it — *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `git status --porcelain package.json pnpm-lock.yaml` returns nothing and `git diff HEAD --stat -- package.json pnpm-lock.yaml` is empty. Every import in the ticket's files names an already-installed package: `zod` (`src/lib/validation/member.ts:1`), `next/cache` (`src/actions/members.ts:15`), `next/navigation` and `react` (`members-manager.tsx:15-17`), `react` (`page.tsx:1`) |

## R1 detail

`git diff --name-only HEAD` plus `git ls-files --others --exclude-standard`, because eleven of this
ticket's files are new and a name-only diff against `HEAD` does not list an untracked file. A review
that read only the tracked half would have declared `members-manager.tsx` missing.

| Path | State | `allowed_paths` entry |
|---|---|---|
| `src/app/(app)/members/page.tsx` | modified | `src/app/(app)/members/page.tsx` |
| `src/app/(app)/members/members-manager.tsx` | untracked | `src/app/(app)/members/members-manager.tsx` |
| `src/actions/members.ts` | modified | `src/actions/members.ts` |
| `src/lib/validation/member.ts` | modified | `src/lib/validation/member.ts` |
| `src/lib/data/types.ts` | modified | `src/lib/data/types.ts` |
| `src/lib/data/mock/store.ts` | modified | `src/lib/data/mock/store.ts` |
| `src/lib/data/mock/members.ts` | modified | `src/lib/data/mock/members.ts` |
| `src/lib/data/prisma/members.ts` | modified | `src/lib/data/prisma/members.ts` |
| `tests/unit/members.test.ts` | untracked | `tests/unit/members.test.ts` |
| `tests/e2e/members.spec.ts` | untracked | `tests/e2e/members.spec.ts` |
| `.ai/board/tickets/MEM-01/ticket.yaml` | modified | `.ai/board/tickets/MEM-01/**` |
| `.ai/board/tickets/MEM-01/01-story.md` … `99-questions.md` (7 files) | untracked | `.ai/board/tickets/MEM-01/**` |
| **`.ai/board/metrics.md`** | **modified** | **none — see below** |

**`.ai/board/metrics.md` is the one path outside the list, and it is not this ticket's.** Read rather
than assumed: `git diff .ai/board/metrics.md` is `2 insertions, 0 deletions`, and both inserted rows
carry `ba` in the agent column — the `2026-08-23T09:19:29Z` SPEC row and the `2026-08-24T01:36:50Z`
RULE-14 amendment row. Neither is a code change and neither was written by the Developer.

Charging it as an R1 failure would route to `developer` and increment `rework_count`, which RULE-08
forbids for a defect the Developer did not cause and cannot fix. It is also structural rather than
local: `.ai/board/metrics.md` is the board ledger every stage owner appends to, and it is outside
every ticket's `allowed_paths` by construction, because a ticket folder glob can never cover it. Read
literally, R1 would fail on every ticket that ever runs. That is a defect in the model, not in this
implementation, and it belongs in `.ai/board/model-debt.md` rather than in this gate.

**The code is unchanged since pass 1.** `pnpm test` runs 75 tests across 5 files, all green,
including QA's `tests/unit/members.test.ts`; the eight source files carry the same line numbers pass
1 cited, spot-checked at `mock/members.ts:135`, `actions/members.ts:186` and
`members-manager.tsx:411`. The only tree change since `2026-08-23T10:01:29Z` is `01-story.md`, the
two `metrics.md` rows, and `ticket.yaml`'s ledger comments.

## R5 detail

Forty-three contract items from design sections 1.1 to 1.5, plus the two rules section 3 places on
the seam. One row each.

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 `NewMember` — 3 fields, no `groupId`, no `role` default | `src/lib/data/types.ts:108` | yes, character-for-character with the design block |
| §1.1 `MemberPatch` — same 3 fields | `src/lib/data/types.ts:124` | yes |
| §1.1 `CreateMemberOutcome` | `src/lib/data/types.ts:131` | yes |
| §1.1 `UpdateMemberOutcome` | `src/lib/data/types.ts:135` | yes |
| §1.1 `MemberReferences` — both halves, always | `src/lib/data/types.ts:152` | yes |
| §1.1 `DeleteMemberOutcome` — 3 arms, no `cascaded` | `src/lib/data/types.ts:164` | yes |
| §1.1 no existing type modified | `git diff src/lib/data/types.ts` is `+70 −0` | yes |
| §1.2 `listMembers` unchanged | `src/lib/data/mock/members.ts:19` | name, arity and return type unchanged |
| §1.2 `getMember` unchanged | `src/lib/data/mock/members.ts:23` | unchanged |
| §1.2 `createMember(input: NewMember)` | `src/lib/data/mock/members.ts:46` | yes |
| §1.2 `updateMember(id, patch)` | `src/lib/data/mock/members.ts:77` | yes |
| §1.2 `getMemberReferences(id)` | `src/lib/data/mock/members.ts:106` | yes |
| §1.2 `deleteMember(id)` | `src/lib/data/mock/members.ts:135` | yes |
| §1.2 Prisma parity, 4 new `notWired` bodies | `src/lib/data/prisma/members.ts:26, 31, 37, 42` | same names, same arity; parameters `void`-discarded so arity cannot drift |
| §1.2 parity test passes unedited | `tests/unit/seam-parity.test.ts`, green in the 75-test run | not in `allowed_paths` and not edited |
| §1.2 rule 1 — duplicate email refused on create, exact match, no throw | `src/lib/data/mock/members.ts:47-49` | `m.email === input.email`, no `toLowerCase` |
| §1.2 rule 1 — `id` minted, `groupId` literal `null` | `src/lib/data/mock/members.ts:52, 56` | `crypto.randomUUID()`; `groupId: null` written, not taken from input |
| §1.2 rule 1 — writes nothing outside the members collection | `src/lib/data/mock/members.ts:58` | one `members.push`; no `Account`, no `accounts` import in the file |
| §1.2 rule 2 — duplicate refused against *other* members only | `src/lib/data/mock/members.ts:81` | `m.id !== id && m.email === patch.email` |
| §1.2 rule 2 — three fields written, `id`/`groupId` never | `src/lib/data/mock/members.ts:85-87` | exactly `fullName`, `email`, `role` |
| §1.2 rule 2 — nothing written on refusal | `src/lib/data/mock/members.ts:79, 82` | both returns precede the first assignment at `:85` |
| §1.2 rule 3 — `null` for a member that does not exist | `src/lib/data/mock/members.ts:107` | yes |
| §1.2 rule 3 — pure read, both halves always | `src/lib/data/mock/members.ts:108` → `:152-158` | `filter`/`map`/`sort`/`length`; no assignment |
| §1.2 rule 4 — `deleteMember` computes references itself | `src/lib/data/mock/members.ts:139` | calls `referencesTo`, takes no caller input |
| §1.2 rule 4 — read and enforcement are the same predicate | `src/lib/data/mock/members.ts:108` and `:139` both call `referencesTo` at `:152` | one function, two callers; cannot drift |
| §1.2 rule 5 — refuses when *either* half is non-empty | `src/lib/data/mock/members.ts:140` | `length > 0 \|\| ownedDeviceCount > 0` |
| §1.2 rule 5 — nothing written on the refusal path | `src/lib/data/mock/members.ts:141` | returns before the `splice` at `:144` |
| §1.2 rule 6 — exactly one row removed, no cascade | `src/lib/data/mock/members.ts:144` | one `splice`; no seat, device, account or request write |
| §1.2 rule 6 — the F-4 comment naming all three declarations | `src/lib/data/mock/members.ts:120-130` | names `Account.member` (231), `SeatRequest.requester` (206), `Account.createdBy` (235), and the condition that makes them live |
| §1.3 `memberFullNameSchema`, trim before min | `src/lib/validation/member.ts:10` | yes |
| §1.3 `memberEmailSchema`, `.min(1)` before `.email()` | `src/lib/validation/member.ts:21-26` | order preserved; messages verbatim |
| §1.3 `memberRoleSchema` | `src/lib/validation/member.ts:31` | `z.enum(["USER","MANAGER","ADMIN"])` |
| §1.3 `memberIdSchema` | `src/lib/validation/member.ts:40` | yes |
| §1.3 `createMemberSchema` | `src/lib/validation/member.ts:42` | three fields, no `groupId` |
| §1.3 `updateMemberSchema` | `src/lib/validation/member.ts:52` | `id` plus the three |
| §1.3 `memberIdOnlySchema` | `src/lib/validation/member.ts:60` | yes |
| §1.3 `CreateMemberInput`, `UpdateMemberInput` | `src/lib/validation/member.ts:62-63` | yes |
| §1.3 the empty-value placeholder is how "no role chosen" is refused | `members-manager.tsx:394, 397` and `:455, 462` | `defaultValue=""` and `<option value="">` on **both** dialogs; no `required` attribute anywhere |
| §1.4 `MemberFieldName` | `src/actions/members.ts:25` | yes |
| §1.4 `MemberActionError`, 4 arms | `src/actions/members.ts:35` | `REFERENCED` carries structure and no sentence |
| §1.4 `MemberActionResult<T>` | `src/actions/members.ts:41` | yes |
| §1.4 four actions with `unknown` parameters | `src/actions/members.ts:107, 133, 166, 186` | signatures identical to the design block |
| §1.4 step order 1-5, raw `ZodError` never returned | `src/actions/members.ts:1, 108-109, 111, 120, 125-126`; `fieldErrors` at `:66-77` | first message per field wins at `:74` |
| §1.4 refusal mapping, all three rows | `src/actions/members.ts:123` (`DUPLICATE_EMAIL`), `:199` (`REFERENCED`, passed through unchanged), `:150, 177, 198` (`NOT_FOUND`, including `getMemberReferences` returning `null`) | messages held once each at `:45-46` |
| §1.4 `revalidatePath("/members")` on the three writes only | `src/actions/members.ts:125, 154, 202` | `getMemberReferences` at `:166-180` has none — correct |
| §1.5 `MembersPage` default export, server component | `src/app/(app)/members/page.tsx:44` | yes |
| §1.5 `MemberRow` — member, seat codes, `hasAccount` | `src/app/(app)/members/page.tsx:16` | yes |
| §1.5 three existing reads, no new seam function | `src/app/(app)/members/page.tsx:45-49` | `listMembers`, `listSeats`, `listAccounts` under one `Promise.all` |
| §1.5 **no devices import in `page.tsx`** | `page.tsx:4` imports `accounts, members, seats` only | the contractual absence holds |
| §1.5 `MembersManager({ rows })`, no client copy of the list | `members-manager.tsx:100`; `router.refresh()` at `:144, 164, 216` | `rows` is a prop; no `useState` holds a member list |
| §1.5 two-branch delete, chosen before anything is confirmed | `members-manager.tsx:176-194` | read at `:180`, refusal branch `:189-192`, confirm branch `:193`, `NOT_FOUND` → `:184` and opens nothing |
| §1.5 the refused dialog has no confirm control | `members-manager.tsx:509-549` | one `Button`, `member-delete-refused-dismiss` at `:543` |
| §1.5 sign-in column reads `Account` | `page.tsx:51, 67`; rendered at `members-manager.tsx:333-335` | `account` / `no account` literals |
| §1.5 Edit and Delete on every row, unconditionally | `members-manager.tsx:346-369` | no state predicate wraps either control |
| §3 `store.ts` gains one binding and alters no other line | `src/lib/data/mock/store.ts:53` | `+16 −1`, and the one deletion is the import statement the new binding extends |
| §3 `mock/members.ts` repointed to `./store`, gains `seats` and `devices` | `src/lib/data/mock/members.ts:17` | reads the arrays, calls neither `listSeats()` nor `listDevices()` |

Nothing in section 1 is unimplemented, and nothing is implemented beyond it. Three exports exist in
the ticket's files that section 1 does not name — `roleSchema` (`member.ts:38`), `getMembers`
(`actions/members.ts:99`) and the private `referencesTo` (`mock/members.ts:152`). The first two are
Phase B scaffold survivors this ticket did not write and the design does not ask to remove; the third
is private precisely so `seam-parity.test.ts` does not see a fifth export. All three are declared in
`03-impl-log.md` under *Deviations*, and each was checked against section 1 rather than accepted from
the log.

## R7 detail

Design section 6's table was parsed mechanically — the 41 rows between `## 6. Testability contract`
and `### 6.1` — and each id matched against `page.tsx` and `members-manager.tsx`. **32 matched as
string literals or as the template `members-row-${r.member.email}-…`. 9 did not, and all 9 are the
prefix-derived ones**, which is the expected result rather than a gap:

| Not literal in the markup | Emitted by | From |
|---|---|---|
| `members-table` | `DataTable.tsx:29` | `testIdPrefix="members"`, `members-manager.tsx:281` |
| `members-empty` | `DataTable.tsx:25` | same prefix |
| `members-row-<email>` | `DataTable.tsx:39` | same prefix, `rowKey={(r) => r.member.email}` at `members-manager.tsx:280` |
| `member-create-dialog` | `EntityFormDialog.tsx:35` | `testIdPrefix="member-create"`, `members-manager.tsx:380` |
| `member-create-cancel` | `EntityFormDialog.tsx:39` | same prefix |
| `member-create-submit` | `EntityFormDialog.tsx:42` | same prefix |
| `member-edit-dialog` | `EntityFormDialog.tsx:35` | `testIdPrefix="member-edit"`, `members-manager.tsx:423` |
| `member-edit-cancel` | `EntityFormDialog.tsx:39` | same prefix |
| `member-edit-submit` | `EntityFormDialog.tsx:42` | same prefix |

The attribute reaches the DOM in every case: `Dialog.tsx:13, 17` destructures `"data-testid"` and
renders it; `Input.tsx`, `Select.tsx` and `Button.tsx` spread `...props` onto the intrinsic element;
`Badge.tsx:14, 22` takes it explicitly. **41 located, 0 missing.**

## R8 detail

Both IDs in `ticket.yaml:invariants_touched`, reasoned separately and each verified by running the
shipped seam. A reviewer that reads a refusal and calls it enforced has checked that a branch exists,
not that it is taken.

| Invariant | Held by | Citation |
|---|---|---|
| **INV-08** — there is no self-signup; accounts are created by Manager or Admin only | The **absence of a code path**, not a check. `NewMember` (`src/lib/data/types.ts:108`) has three fields and none is a credential; `createMemberSchema` (`src/lib/validation/member.ts:42`) has the same three and a Zod object strips unknown keys; `createMember` (`src/lib/data/mock/members.ts:46-60`) performs one `members.push` and touches nothing else. `mock/members.ts` and `mock/store.ts` contain **no reference to `Account` outside three comment lines** (`mock/members.ts:43, 122, 123`) and `store.ts` does not export that collection at all, so a credential field added to the form could not be wired to anything. AC-4's inspectable half is `member-create-no-account` at `members-manager.tsx:411`. **Verified by execution:** creating a member with `role: "ADMIN"` grew the members collection by one and left `listAccounts()` deeply equal to its prior value — and the prior value is non-empty, so the assertion is not vacuous | `src/lib/data/mock/members.ts:46-60`; `src/lib/data/types.ts:108`; `members-manager.tsx:411` |
| **INV-12** — a Member may not be deleted while they occupy a seat or own a device; refused, not cascaded | `deleteMember` at `src/lib/data/mock/members.ts:135-146` **and nowhere else**. It calls `referencesTo` itself at `:139` rather than trusting a caller, refuses at `:141` when either half is non-empty, and that return precedes the only mutation in the function (`:144`), so the refusal path contains no write at all. The UI's two-dialog split at `members-manager.tsx:189-193` is **not** the mechanism — it selects a dialog; a caller reaching `src/actions/members.ts:196` directly meets the same predicate. Not a UI affordance, so the invariants ledger's prohibition is satisfied. **Verified by execution, three cases, each asserting its own non-vacuity:** (1) a seat-occupying member — refused `REFERENCED`, `occupiedSeatCodes` non-empty, `seats` and `devices` deep-equal to their pre-call clones, member count unchanged; (2) **the device half alone** — a freshly created member occupying no seat, given one device, refused with `{occupiedSeatCodes: [], ownedDeviceCount: 1}`, which is exactly the case a system enforcing occupancy alone would let through; (3) a member nothing refers to — **deleted**, proving the refusal is a predicate and not a blanket. INV-12's third clause, *the references are removed first*, describes an ordering a person follows and is out-of-scope items 3 and 4; what this ticket owes it is the refusal plus the message naming what to remove, and both are present | `src/lib/data/mock/members.ts:135-146`; predicate at `:152-158`; action at `src/actions/members.ts:196-200` |

**INV-01, INV-05 and INV-06 stay discharged by ADR-005**, and that was checked mechanically rather
than inherited. Grepping the added lines of the whole `src/` diff for an assignment to a seat or
device field, or a mutation of either array, returns three hits and **all three are comparisons**:
`page.tsx` `seat.occupantId === null`, `mock/members.ts:154` `s.occupantId === memberId`, and
`:157` `d.ownerId === memberId`. No `occupantId =`, no `ownerId =`, no `rank =`, no `seatId =`, and
no `push`/`splice`/`pop`/`shift` on `seats` or `devices` anywhere in the diff. MEM-01 writes nothing
under the seat or device surface.

Named honestly, as both the design and the impl log do: under `DATA_SOURCE=mock` there is no database
constraint behind INV-12, and the draft schema declares `SetNull` on `Seat.occupant` and
`Device.owner` — the cascade ADR-005 rejected. That divergence belongs to whoever applies the
migration; it is not something this implementation could have fixed, and RULE-09 puts it beyond every
agent. It is already recorded in `02-design.md` section 4.

## Findings

None. No check failed, so no row is routed and `rework_count` stays `0`.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | — | — | — |

**What is open against MEM-01 is not open against this gate**, and the distinction matters because
the ticket sits in `REWORK` and a reader could reasonably expect a re-review to be about that:

- **F-6** — `02-design.md` section 6.3 claims a new member appears in `/devices`' owner select, which
  `06-test-report.md` measured false three ways. Section 1.4 step 5 revalidates `"/members"` only, so
  **the implementation matches its contract and the design contradicts itself**. That is why it routes
  to `tech-lead-design` and not here: R5 asks whether section 1 was implemented, and it was.
- **F-7** — `pnpm test:e2e` exits 1 on ten of fifteen runs at `tests/e2e/devices.spec.ts:347`, a file
  outside this ticket's `allowed_paths`. Not a MEM-01 code defect and not something MEM-01 may touch.
- **F-4** and **F-5** — a human's, unchanged since DESIGN. Three declared cascades that are provably
  unreachable, and `Member.authUserId` mandated by ADR-003 and absent from the schema.

None of the four is reachable by R1 through R9, and inventing a row for one of them would be this
gate reporting on work it was not given.

## Agreement with pass 1

Read only after the nine checks above were complete. **Pass 1 and pass 2 agree on all nine verdicts
and on the absence of findings**, having been derived independently 15 hours apart against a code
tree that did not change. Two differences in the record, neither a disagreement:

1. Pass 1 counted **nine** paths in the diff; this pass counts **nineteen**, because it took
   `git ls-files --others --exclude-standard` as well as `git diff --name-only`. The eleven extra are
   all untracked and all inside `allowed_paths` — the seven ticket artifacts, `members-manager.tsx`,
   and QA's two test files, which did not exist at pass 1. Same verdict, wider evidence.
2. Pass 1 recorded F-1, F-2 and F-3 as *outstanding against `ba`, owed before `/qa`*. They were
   answered at `2026-08-24T01:36:50Z`, and the five criteria that answer them — `AC-3a`, `AC-3b`,
   `AC-3c`, `AC-7a`, `AC-7b` — now name the three refusals this implementation ships. That paragraph
   of pass 1 is discharged.

## What this pass did not do to the board, and why

**The ticket is left at `state: REWORK`. It was not advanced to `QA`.**

The `/review` command says to set `QA` on a PASS. That instruction presumes the ticket is in `REVIEW`,
and it is not — `MEM-01` is in `REWORK` with two of the three QA findings untouched. `99-questions.md`
carries F-6 and F-7 with no answer written beneath either, and `02-design.md`'s changelog still holds
one entry, `2026-08-23T09:28:06Z`. Setting `QA` would mark two open findings discharged by a gate that
never examined them, and would send a fresh QA session back into an e2e suite that F-7 says fails on
two runs in three. That is a false board state, and `backlog.md` and `metrics.md` would inherit it.

`gates.review` is left reading `passed: true, at: "2026-08-23T10:01:29Z"`. **The gate was confirmed,
not re-passed**, which is the same handling the ledger's `2026-08-23T07:09:56Z` row gave a re-run
`/spec`. `rework_count` is untouched at `0`, and `owner` is left at `ba` because who holds a ticket in
`REWORK` is the orchestrator's to write, not a reviewer's.

Nothing was written outside `.ai/board/tickets/MEM-01/**`. A temporary vitest file was created under
`tests/unit/` to run the R8 verification and was deleted in the same command; `git status --porcelain
tests/` afterwards lists only QA's two files.

## Verdict

**`PASS`** on R1 through R9, nine checks, nine citations, no finding — **and the ticket does not
advance**, because REVIEW is not the stage holding it. What runs next is `tech-lead-design` answering
F-6 and F-7, then `/qa` in a fresh session.

---
---

# Pass 3 — 2026-08-24T02:25:39Z, the re-review of design version 2

```yaml
---
ticket: MEM-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-24T02:25:39Z
inputs_read: [ .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/02-design.md, .ai/board/tickets/MEM-01/03-impl-log.md, .ai/board/tickets/MEM-01/ticket.yaml, .ai/board/tickets/MEM-01/99-questions.md, .ai/registry/invariants.md, .ai/01-operating-model.md, .ai/templates/review-report.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---
```

Fresh session. Files only, no message channel to the Developer or to any other agent (RULE-13).
`chat_before_verdict: none` is true as written. `05-test-plan.md` and `06-test-report.md` were not
opened beyond their front-matter, which was read for one purpose only — to establish that QA has not
re-run and that the `tests/e2e/devices.spec.ts` edit in the tree is unaccompanied by a QA artifact.
Passes 1 and 2 above were read only after the nine checks below were complete.

**This is a real re-review, unlike pass 2.** `ticket.yaml:75` reads `state: REVIEW` and `:76` reads
`owner: "tech-lead-review"`; the ticket was routed here. The code changed: `02-design.md` version 2
(`2026-08-24T01:59:07Z`) rewrote section 1.4 step 5, and the Developer implemented it. So the nine
checks were derived again from the working tree rather than carried over — which is the whole reason
`.ai/standards/session-model.md` discards a reviewer after each verdict.

## What changed since the last passing review

| | Version 1 | Version 2 |
|---|---|---|
| Design §1.4 step 5 | `revalidatePath("/members")` on the three write actions | **`revalidatePath("/members")` and `revalidatePath("/devices")`** |
| Design §5 `allowed_paths` | 10 files + ticket folder | **11 files + ticket folder** — `tests/e2e/devices.spec.ts` added (F-7) |
| `src/actions/members.ts` | one `revalidatePath` per write action | **two**, at `:143/:145`, `:174/:176`, `:224/:226`, plus the block comment at `:17-33` |
| `tests/e2e/devices.spec.ts` | untouched | one retrying assertion at `:373` |
| `01-story.md` | 11 criteria | **16** — `AC-3a`, `AC-3b`, `AC-3c`, `AC-7a`, `AC-7b` added by `ba` |
| Design findings | F-1 … F-5 | **F-6, F-7 resolved; F-8 raised** and routed to a human |

F-6 and F-7 were defects in version 1 of the *design*, not in the implementation, which is why
`rework_count` stays `0` under RULE-08 and why the design's own changelog says so.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Twenty paths across tracked and untracked; nineteen matched to a `ticket.yaml:162-181` entry, table in *R1 detail*. The twentieth is `.ai/board/metrics.md`, whose two added rows both carry `ba` in the agent column — not the Developer's write, and RULE-08 forbids charging it here |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, captured exit status **`0`**, no diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, captured exit status **`0`**, no output, no warnings |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `page.tsx:4-5` and `members-manager.tsx:34` import `@/lib/data`; `src/actions/members.ts:35-36` the same. `grep -rn "prisma\|@prisma/client\|PrismaClient\|lib/data/prisma"` across the ticket's non-seam files returns three hits, all prose — `page.tsx:38`, `member.ts:7`, `member.ts:18`. Enforced independently by `eslint.config.mjs:28-31` with the seam's own directory exempted at `:76-82`, and R3 is green |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | 45 items, one row each in *R5 detail*, every row a `file:line`. Includes the two version-2 items |
| R6 | Permission gating matches design section 2 | **PASS** | Section 2 specifies **no gate** plus a step-3 comment at the line where the check belongs. All four present at `src/actions/members.ts:129, 157, 194, 214`. No `PermissionGate` import, no `can()` call, no `ROLE_RANK` read — the four grep hits are `members.ts:136`, `members-manager.tsx:10`, `:37` and `member.ts:28`, all comments. `src/lib/auth/` clean in `git status` |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | **46 of 46** — 41 in the section 6 table and 5 more in section 6.3. Zero missing. *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | INV-08 and INV-12 reasoned individually and re-verified **by execution against the version 2 tree**, four cases, each asserting its own non-vacuity — *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `git status --porcelain package.json pnpm-lock.yaml` empty; `git diff HEAD --stat` on both empty. Every import names an already-installed package: `next/cache` (`src/actions/members.ts:15`), `zod` (`member.ts:1`), `next/navigation` and `react` (`members-manager.tsx:15-17`), `react` (`page.tsx:1`). Version 2 added **no import at all** — `revalidatePath` was already imported |

## R1 detail

`git diff --name-only HEAD` plus `git ls-files --others --exclude-standard`, because ten of this
ticket's twenty paths are untracked and a name-only diff does not list them.

| Path | State | `allowed_paths` entry |
|---|---|---|
| `src/app/(app)/members/page.tsx` | modified | matched |
| `src/app/(app)/members/members-manager.tsx` | untracked | matched |
| `src/actions/members.ts` | modified | matched |
| `src/lib/validation/member.ts` | modified | matched |
| `src/lib/data/types.ts` | modified | matched |
| `src/lib/data/mock/store.ts` | modified | matched |
| `src/lib/data/mock/members.ts` | modified | matched |
| `src/lib/data/prisma/members.ts` | modified | matched |
| `tests/unit/members.test.ts` | untracked | matched |
| `tests/e2e/members.spec.ts` | untracked | matched |
| **`tests/e2e/devices.spec.ts`** | **modified** | **matched — the version 2 addition, `ticket.yaml:180`** |
| `.ai/board/tickets/MEM-01/ticket.yaml` | modified | `.ai/board/tickets/MEM-01/**` |
| `.ai/board/tickets/MEM-01/` — 7 artifacts | untracked | `.ai/board/tickets/MEM-01/**` |
| **`.ai/board/metrics.md`** | **modified** | **none — see below** |

**`tests/e2e/devices.spec.ts` was checked rather than waved through**, because it entered
`allowed_paths` in the same document that authorised the edit. `02-design.md` section 5 carries all
twelve entries and they match `ticket.yaml:162-181` verbatim, including this one. The diff is a
**pure addition of six lines** — five of comment and one assertion,
`await expect(page.getByTestId(\`devices-row-${tag}-model\`)).toHaveText("QA model AC4 after")` at
`tests/e2e/devices.spec.ts:373` — inserted between the dialog-hidden assertion at `:368` and the
`rowState` snapshot at `:375`. Nothing in `DEV-01`'s spec is deleted, weakened or re-scoped, and no
assertion is removed. That is the shape design §5 authorised: *one retrying assertion; no criterion
changes*.

**`.ai/board/metrics.md` is the one path outside the list.** Read rather than assumed:
`git diff` reports `2 insertions, 0 deletions`, and both rows carry `ba` in the agent column — the
`2026-08-23T09:19:29Z` SPEC row and the `2026-08-24T01:36:50Z` RULE-14 amendment row. Neither is a
code change and neither is the Developer's. Charging it would route to `developer` and increment
`rework_count`, which RULE-08 forbids for a defect the Developer did not cause and cannot fix. It is
structural besides: `metrics.md` is the ledger every stage owner appends to and no ticket-folder glob
can ever cover it, so R1 read literally would fail on every ticket forever. That belongs in
`.ai/board/model-debt.md`, not in this gate.

## R5 detail

Forty-five items from design section 1, plus section 3's two rules on the seam. The two version-2
rows are marked **v2**.

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 `NewMember` | `src/lib/data/types.ts:108` | three fields, no `groupId`, no `role` default |
| §1.1 `MemberPatch` | `src/lib/data/types.ts:124` | same three fields |
| §1.1 `CreateMemberOutcome` | `src/lib/data/types.ts:131` | yes |
| §1.1 `UpdateMemberOutcome` | `src/lib/data/types.ts:135` | yes |
| §1.1 `MemberReferences` | `src/lib/data/types.ts:152` | both halves, always |
| §1.1 `DeleteMemberOutcome` | `src/lib/data/types.ts:164` | three arms, no `cascaded` |
| §1.1 no existing type modified | `git diff src/lib/data/types.ts` is `+70 −0` | yes |
| §1.2 `listMembers` unchanged | `src/lib/data/mock/members.ts:19` | name, arity, return type unchanged |
| §1.2 `getMember` unchanged | `src/lib/data/mock/members.ts:23` | unchanged |
| §1.2 `createMember(input: NewMember)` | `src/lib/data/mock/members.ts:46` | yes |
| §1.2 `updateMember(id, patch)` | `src/lib/data/mock/members.ts:77` | yes |
| §1.2 `getMemberReferences(id)` | `src/lib/data/mock/members.ts:106` | yes |
| §1.2 `deleteMember(id)` | `src/lib/data/mock/members.ts:135` | yes |
| §1.2 Prisma parity, four `notWired` bodies | `src/lib/data/prisma/members.ts:26, 31, 37, 42` | same names and arity; parameters `void`-discarded so arity cannot drift |
| §1.2 `seam-parity.test.ts` passes unedited | green in the 79-test run; not in `allowed_paths` | yes |
| §1.2 rule 1 — duplicate email refused, exact match, no throw | `src/lib/data/mock/members.ts:47-49` | `m.email === input.email`, no case folding |
| §1.2 rule 1 — `id` minted, `groupId` literal `null` | `src/lib/data/mock/members.ts:52, 56` | `crypto.randomUUID()`; `groupId: null` written, not taken from input |
| §1.2 rule 1 — writes nothing outside the members collection | `src/lib/data/mock/members.ts:58` | one `push`; no `Account`, no `accounts` import in the file |
| §1.2 rule 2 — duplicate refused against *other* members only | `src/lib/data/mock/members.ts:81` | `m.id !== id && m.email === patch.email` |
| §1.2 rule 2 — three fields written, `id`/`groupId` never | `src/lib/data/mock/members.ts:85-87` | exactly `fullName`, `email`, `role` |
| §1.2 rule 2 — nothing written on refusal | `src/lib/data/mock/members.ts:79, 82` | both returns precede the first assignment at `:85` |
| §1.2 rule 3 — `null` for a member that does not exist | `src/lib/data/mock/members.ts:107` | yes |
| §1.2 rule 3 — pure read, both halves always | `src/lib/data/mock/members.ts:108` → `:152-158` | `filter`/`map`/`sort`/`length`, no assignment |
| §1.2 rule 4 — `deleteMember` computes references itself | `src/lib/data/mock/members.ts:139` | takes no caller input |
| §1.2 rule 4 — read and enforcement are one predicate | `:108` and `:139` both call `referencesTo` at `:152` | cannot drift |
| §1.2 rule 5 — refuses when *either* half is non-empty | `src/lib/data/mock/members.ts:140` | `length > 0 \|\| ownedDeviceCount > 0` |
| §1.2 rule 5 — nothing written on the refusal path | `src/lib/data/mock/members.ts:141` | returns before the `splice` at `:144` |
| §1.2 rule 6 — one row removed, no cascade | `src/lib/data/mock/members.ts:144` | one `splice`; no seat, device, account or request write |
| §1.2 rule 6 — the F-4 comment naming all three declarations | `src/lib/data/mock/members.ts:120-130` | `Account.member` (231), `SeatRequest.requester` (206), `Account.createdBy` (235) |
| §1.3 `memberFullNameSchema`, trim before min | `src/lib/validation/member.ts:10` | yes |
| §1.3 `memberEmailSchema`, `.min(1)` before `.email()` | `src/lib/validation/member.ts:21-26` | order preserved, messages verbatim |
| §1.3 `memberRoleSchema` | `src/lib/validation/member.ts:31` | `z.enum(["USER","MANAGER","ADMIN"])` |
| §1.3 `memberIdSchema` | `src/lib/validation/member.ts:40` | yes |
| §1.3 `createMemberSchema` | `src/lib/validation/member.ts:42` | three fields, no `groupId` |
| §1.3 `updateMemberSchema` | `src/lib/validation/member.ts:52` | `id` plus the three |
| §1.3 `memberIdOnlySchema` | `src/lib/validation/member.ts:60` | yes |
| §1.3 `CreateMemberInput`, `UpdateMemberInput` | `src/lib/validation/member.ts:62-63` | yes |
| §1.3 empty placeholder is how "no role chosen" is refused | `members-manager.tsx:394, 397` and `:455, 462` | `defaultValue=""` and `<option value="">` on **both** dialogs; no `required` attribute |
| §1.4 `MemberFieldName` | `src/actions/members.ts:43` | yes |
| §1.4 `MemberActionError`, four arms | `src/actions/members.ts:53` | `REFERENCED` carries structure and no sentence |
| §1.4 `MemberActionResult<T>` | `src/actions/members.ts:59` | yes |
| §1.4 four actions, `unknown` parameters | `src/actions/members.ts:125, 153, 188, 208` | identical to the design block |
| §1.4 step order 1-5, raw `ZodError` never returned | `:1, 126-127, 129, 138, 143-146`; `fieldErrors` at `:84-95` | first message per field wins at `:92` |
| §1.4 refusal mapping, all three rows | `:141` (`DUPLICATE_EMAIL`), `:219` (`REFERENCED`, passed through unchanged), `:170, 199, 218` (`NOT_FOUND`, including `getMemberReferences` returning `null`) | messages held once each at `:63-64` |
| **§1.4 step 5 v2 — `revalidatePath("/members")` AND `revalidatePath("/devices")` on the three write actions** | `src/actions/members.ts:143/145` (create), `:174/176` (update), `:224/226` (delete) | **six calls, three pairs, exactly as specified** |
| **§1.4 step 5 v2 — `getMemberReferences` does not revalidate** | `src/actions/members.ts:188-206` | **no `revalidatePath` in that range; the six calls are all in the three write actions** |
| §1.5 `MembersPage` default export, server component | `src/app/(app)/members/page.tsx:44` | yes |
| §1.5 `MemberRow` — member, seat codes, `hasAccount` | `src/app/(app)/members/page.tsx:16` | yes |
| §1.5 three existing reads, no new seam function | `src/app/(app)/members/page.tsx:45-49` | `listMembers`, `listSeats`, `listAccounts` under one `Promise.all` |
| §1.5 **no devices import in `page.tsx`** | `page.tsx:4` imports `accounts, members, seats` only | the contractual absence holds |
| §1.5 `MembersManager({ rows })`, no client copy of the list | `members-manager.tsx:100`; `router.refresh()` at `:144, 164, 216` | `rows` is a prop |
| §1.5 two-branch delete, chosen before anything is confirmed | `members-manager.tsx:176-194` | read at `:180`, refusal `:189-192`, confirm `:193`, `NOT_FOUND` → `:184` opens nothing |
| §1.5 refused dialog has no confirm control | `members-manager.tsx:509-549` | one `Button`, `member-delete-refused-dismiss` at `:543` |
| §1.5 sign-in column reads `Account` | `page.tsx:51, 67`; rendered at `members-manager.tsx:333-335` | `account` / `no account` |
| §1.5 Edit and Delete on every row, unconditionally | `members-manager.tsx:346-369` | no state predicate wraps either |
| §3 `store.ts` gains one binding, alters no other line | `src/lib/data/mock/store.ts:53` | the one deletion is the import the new binding extends |
| §3 `mock/members.ts` repointed to `./store` with `seats` and `devices` | `src/lib/data/mock/members.ts:17` | reads the arrays; calls neither `listSeats()` nor `listDevices()` |

**Two things the version 2 delta did not do, and both were checked.** It added no import —
`revalidatePath` was already imported at `:15`, so R9 has nothing new to judge. And it changed nothing
else in `src/`: seven of the eight version-1 source files carry the same content and the same
structure this reviewer verified line by line, which is what let the F-6 delta be read at a glance.

**The behavioural half of F-6 is QA's, and this pass deliberately did not measure it.** R5 asks
whether the contract item is implemented, and `revalidatePath("/devices")` is present at three call
sites. Whether the Next cache then actually serves a fresh `/devices` is an observation that needs a
clean `.next`, a production server and a browser — and `03-impl-log.md` records that the Developer's
first attempt at exactly that measurement was corrupted by a concurrent `pnpm test:e2e` in this same
tree, and that recovering from it involved `pkill` and `rm -rf .next` against another session's
build. Repeating that during a review would risk the same collision to re-derive a number that the
QA gate exists to establish. Design section 6.3 tells QA to treat it as load-bearing; that is where it
gets measured.

## R7 detail

Design section 6's main table was parsed mechanically — the 41 rows between `## 6. Testability
contract` and `### 6.1` — and matched against `page.tsx` and `members-manager.tsx`. **32 matched as
string literals or as the template `members-row-${r.member.email}-…`; the 9 that did not are exactly
the prefix-derived set**, each traced to the component that emits it:

| Not literal | Emitted by | From |
|---|---|---|
| `members-table` | `DataTable.tsx:29` | `testIdPrefix="members"`, `members-manager.tsx:281` |
| `members-empty` | `DataTable.tsx:25` | same prefix |
| `members-row-<email>` | `DataTable.tsx:39` | same prefix, `rowKey={(r) => r.member.email}` at `:280` |
| `member-create-dialog` / `-cancel` / `-submit` | `EntityFormDialog.tsx:35, 39, 42` | `testIdPrefix="member-create"`, `members-manager.tsx:380` |
| `member-edit-dialog` / `-cancel` / `-submit` | `EntityFormDialog.tsx:35, 39, 42` | `testIdPrefix="member-edit"`, `members-manager.tsx:423` |

**Section 6.3's five `DEV-01` selectors were checked too, and all five exist.** They are part of
section 6 and R7 does not stop at the first table. `devices-create-open` at
`devices-manager.tsx:273`, `device-create-tag` at `:452`, `device-create-model` at `:457`,
`device-create-owner` at `:462`, and `device-create-submit` from `testIdPrefix="device-create"` at
`:448`. **46 of 46 located, 0 missing.**

The attribute reaches the DOM in every case: `Dialog.tsx:13, 17` destructures `"data-testid"`;
`Input.tsx`, `Select.tsx` and `Button.tsx` spread `...props`; `Badge.tsx:14, 22` takes it explicitly.

## R8 detail

Both IDs in `ticket.yaml:150`, reasoned separately and re-run against the version 2 tree. Version 2
touched no seam function, so the mechanisms are unchanged — but "unchanged" is a claim, and it was
executed rather than asserted.

| Invariant | Held by | Citation |
|---|---|---|
| **INV-08** — no self-signup; accounts are created by Manager or Admin only | The **absence of a code path**, not a check, which the invariants ledger accepts and a UI affordance would not be. `NewMember` (`types.ts:108`) has three fields and none is a credential; `createMemberSchema` (`member.ts:42`) has the same three and a Zod object strips unknown keys; `createMember` (`mock/members.ts:46-60`) performs one `members.push` and nothing else. `mock/members.ts` and `mock/store.ts` reference `Account` only in three comment lines (`mock/members.ts:43, 122, 123`), and `store.ts` does not export that collection, so a credential field added to the form could not be wired to anything. AC-4's inspectable half is `member-create-no-account` at `members-manager.tsx:411`. **Executed:** creating a member with `role: "ADMIN"` grew the members collection by exactly one and left `listAccounts()` deeply equal to its prior value — asserted non-empty first, so the equality is a real observation and not a comparison of two empty arrays | `src/lib/data/mock/members.ts:46-60`; `src/lib/data/types.ts:108`; `members-manager.tsx:411` |
| **INV-12** — a Member may not be deleted while they occupy a seat or own a device; refused, not cascaded | `deleteMember` at `src/lib/data/mock/members.ts:135-146` **and nowhere else**. It calls `referencesTo` itself at `:139` rather than trusting a caller, refuses at `:141` when either half is non-empty, and that return precedes the only mutation in the function (`:144`), so the refusal path contains no write at all. The UI's two-dialog split at `members-manager.tsx:189-193` selects a dialog and is **not** the mechanism — a caller reaching `src/actions/members.ts:216` directly meets the same predicate. **Executed, three cases:** (1) a seat-occupying member → `REFERENCED`, `occupiedSeatCodes` non-empty, `seats` and `devices` deep-equal to their pre-call clones, member count unchanged; (2) **the device half alone** — a member created fresh, occupying no seat, given one device → refused `{occupiedSeatCodes: [], ownedDeviceCount: 1}`, which is precisely the case a system enforcing occupancy alone would let through; (3) a member nothing refers to → **deleted**, which is what stops case 1 from being satisfied by a function that refuses everything | `src/lib/data/mock/members.ts:135-146`; predicate `:152-158`; action `src/actions/members.ts:208-227` |

**INV-01, INV-05 and INV-06 stay discharged by ADR-005**, checked mechanically against the version 2
diff and not inherited from the earlier passes. Grepping every added line in `src/` for an assignment
to a seat or device field, or a mutation of either array — `occupantId =`, `ownerId =`, `.rank =`,
`seatId =`, `push`/`splice`/`pop`/`shift` on `seats` or `devices` — returns **nothing**. The three
occurrences of those field names are all comparisons (`===`) inside read predicates. `members-manager.tsx`
is clean by the same test. MEM-01 writes nothing under the seat or device surface, and version 2 did
not change that: `revalidatePath("/devices")` invalidates a cache entry, it does not write a device.

Stated honestly, as the design does: under `DATA_SOURCE=mock` there is no database constraint behind
INV-12, and the draft schema declares `SetNull` on `Seat.occupant` and `Device.owner` — the cascade
ADR-005 rejected. That belongs to whoever applies the migration under RULE-09; it is recorded in
`02-design.md` section 4 and is not something this implementation could fix.

## Findings

None. No check failed, so no row is routed and `rework_count` stays `0`.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | — | — | — |

### Three observations that are not findings, recorded because silence would be read as absence

None of these is reachable by R1 through R9, and inventing a row for one would be this gate reporting
on work it was not given. They are named so the next reader does not conclude they went unseen.

1. **`02-design.md` section 6.3 still closes with *"Nothing in `tests/e2e/devices.spec.ts` is
   edited"*, and section 5 now authorises exactly such an edit, which is in the tree at `:373`.** In
   context the sentence is scoped to what `members.spec.ts` does while driving the device dialog, and
   the sentence after it supports that reading — so it is stale rather than wrong. But it is stale in
   section 6, which RULE-05 makes QA's only channel, and it is the same shape of defect as F-6: two
   parts of one design disagreeing. One clause, and `tech-lead-design` owns it.
2. **The version 1 half of `03-impl-log.md` cites `src/actions/members.ts:107, 133, 166, 186` for the
   four actions; version 2's comment block moved them to `:125, 153, 188, 208`.** The log declares
   that section unchanged, so it is disclosed rather than false, and the version 2 section carries
   correct citations (`:144`, `:175`, `:225`). Every R5 row above was derived from the file, not from
   the log.
3. **`tests/e2e/devices.spec.ts` is modified in the tree with no QA artifact recording it.**
   `05-test-plan.md` and `06-test-report.md` are still the `2026-08-23` versions and `gates.qa` reads
   `passed: false`. `03-impl-log.md` attributes the edit to QA and explicitly says this cycle did not
   make it; the path is in `allowed_paths`, so R1 is satisfied either way. The artifact that records
   it is owed at the QA re-run.

**F-4, F-5 and F-8 are a human's and are untouched by this gate.** F-8 in particular is larger than
anything in this ticket — every application route builds `○ (Static)` and `ROO-01`'s `deleteRoom`
leaves `/seats` and `/devices` stale, which makes INV-11 observably false through a rendered surface
in a `DONE` ticket. It is correctly outside `allowed_paths` and correctly routed. Worth saying plainly
that this implementation had the option to hide it — `revalidatePath("/", "layout")` would have fixed
F-6 in one line and papered over F-8 in the same stroke — and declined it, which is what section 7
alternative G asked for and what `src/actions/members.ts:27-30` records at the line.

## Verdict

**`PASS`.** Nine checks, nine citations, no finding. `rework_count` stays `0`: this cycle's cause was
F-6, a defect in version 1 of the design, and RULE-08 keeps an upstream defect off the Developer's
budget.

The ticket advances to **`QA`**. Unlike pass 2, advancing is correct here — the ticket was routed to
`REVIEW` and both design-side findings that held it are resolved in version 2 and implemented.

Three things this pass did not do, named so they are not inferred. It did not measure F-6's cache
behaviour, for the reason in *R5 detail*; that is the QA gate's, and section 6.3 tells QA to treat it
as load-bearing. It did not run `pnpm test:e2e`, which is QA's and is where F-7's repair gets its
verdict. And it did not talk to anyone — there was no channel by which it could have (RULE-13).

---
---

# Pass 4 — 2026-08-24T08:53:00Z, the re-review of design version 4 (F-9 rework)

```yaml
---
ticket: MEM-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-24T08:53:00Z
inputs_read: [ .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/02-design.md, .ai/board/tickets/MEM-01/03-impl-log.md, .ai/board/tickets/MEM-01/ticket.yaml, .ai/board/tickets/MEM-01/99-questions.md, .ai/registry/invariants.md, .ai/01-operating-model.md, .ai/templates/review-report.md, git diff ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---
```

Fresh session. Files only, no message channel to the Developer or to any other agent (RULE-13).
`chat_before_verdict: none` is true as written.

**This is a real re-review of the design version 4 rework cycle.** `ticket.yaml` was routed to `REVIEW` by `developer` at `2026-08-24T08:40:28Z` after implementing contract item §1.6 (`export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx:3`), answering finding F-9.

## What changed since the last passing review (Pass 3)

| | Pass 3 (Version 2) | Pass 4 (Version 4) |
|---|---|---|
| Design §1.6 | absent | **`export const dynamic = "force-dynamic"` in `src/app/(app)/layout.tsx`** |
| Design §5 `allowed_paths` | 11 files + ticket folder (12 entries) | **12 files + ticket folder (13 entries)** — `src/app/(app)/layout.tsx` added |
| `src/app/(app)/layout.tsx` | unmodified (static prerender default) | **`export const dynamic = "force-dynamic"` added at line 3** |
| `02-design.md` | version 2 (passed) | **version 4 (passed, F-9 answered and taken)** |
| `03-impl-log.md` | version 2 log | **version 3 log (rework cycle 2 for F-9)** |
| Findings | F-6, F-7 resolved; F-8 open | **F-9 resolved and implemented; F-10 raised to steward; F-8 open to human** |

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Twenty paths across tracked and untracked; nineteen matched to `ticket.yaml:302-332` entry (including `src/app/(app)/layout.tsx` at line 331 and `tests/e2e/devices.spec.ts` at line 320), table in *R1 detail*. The twentieth is `.ai/board/metrics.md`, whose two added rows both carry `ba` in the agent column — not the Developer's write, and RULE-08 forbids charging it here |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, captured exit status **`0`**, no diagnostics |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, captured exit status **`0`**, no output, no warnings |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `src/app/(app)/members/page.tsx:4-5` and `members-manager.tsx:34` import `@/lib/data`; `src/actions/members.ts:35-36` the same. `grep -rn "prisma\|@prisma/client\|PrismaClient\|lib/data/prisma"` across the ticket's non-seam files returns three hits, all prose/comments — `page.tsx:30, 38`, `member.ts:28`. Enforced independently by `eslint.config.mjs:28-31` with the seam directory exempted at `:76-82`, and R3 is green |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | 46 items, one row each in *R5 detail*, every row a `file:line`. Includes the version-4 addition §1.6 |
| R6 | Permission gating matches design section 2 | **PASS** | Section 2 specifies **no gate** plus a step-3 comment at the line where the check belongs. All four present at `src/actions/members.ts:129, 157, 194, 214`. No `PermissionGate` import, no `can()` call, no `ROLE_RANK` read — grep confirms all hits are comments. `src/lib/auth/` clean in `git status` |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | **46 of 46** — 41 in the section 6 table and 5 more in section 6.3. Zero missing. *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | INV-08 and INV-12 reasoned individually and re-verified **by execution against the working tree**, four cases, each asserting its own non-vacuity — *R8 detail* |
| R9 | No dependency added without an ADR | **PASS** | `git status --porcelain package.json pnpm-lock.yaml` empty; `git diff HEAD --stat` on both empty. Every import names an already-installed package: `next/cache` (`src/actions/members.ts:15`), `zod` (`member.ts:1`), `next/navigation` and `react` (`members-manager.tsx:15-17`), `react` (`page.tsx:1`), `next/link` (`layout.tsx:1`). Version 4 added **no import at all** |

## R1 detail

`git diff --name-only HEAD` plus `git ls-files --others --exclude-standard`.

| Path | State | `allowed_paths` entry |
|---|---|---|
| `src/app/(app)/layout.tsx` | modified | matched — the version 4 addition, `ticket.yaml:331` |
| `src/app/(app)/members/page.tsx` | modified | matched |
| `src/app/(app)/members/members-manager.tsx` | untracked | matched |
| `src/actions/members.ts` | modified | matched |
| `src/lib/validation/member.ts` | modified | matched |
| `src/lib/data/types.ts` | modified | matched |
| `src/lib/data/mock/store.ts` | modified | matched |
| `src/lib/data/mock/members.ts` | modified | matched |
| `src/lib/data/prisma/members.ts` | modified | matched |
| `tests/unit/members.test.ts` | untracked | matched |
| `tests/e2e/members.spec.ts` | untracked | matched |
| `tests/e2e/devices.spec.ts` | modified | matched — the version 2 addition, `ticket.yaml:320` |
| `.ai/board/tickets/MEM-01/ticket.yaml` | modified | `.ai/board/tickets/MEM-01/**` |
| `.ai/board/tickets/MEM-01/` — 7 artifacts | untracked | `.ai/board/tickets/MEM-01/**` |
| `.ai/board/metrics.md` | modified | none — `ba` SPEC and RULE-14 rows, not Developer write |

**`src/app/(app)/layout.tsx` was checked rather than waved through.** The diff on `src/app/(app)/layout.tsx` is exactly two added lines (`export const dynamic = "force-dynamic";` and blank line) between line 1 (`import Link from "next/link";`) and `const NAV = ...`. No markup, nav array or testids were touched.

## R5 detail

Forty-six items from design section 1, plus section 3's two rules on the seam. The version-4 item is marked **v4**.

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 `NewMember` | `src/lib/data/types.ts:108` | three fields, no `groupId`, no `role` default |
| §1.1 `MemberPatch` | `src/lib/data/types.ts:124` | same three fields |
| §1.1 `CreateMemberOutcome` | `src/lib/data/types.ts:131` | yes |
| §1.1 `UpdateMemberOutcome` | `src/lib/data/types.ts:135` | yes |
| §1.1 `MemberReferences` | `src/lib/data/types.ts:152` | both halves, always |
| §1.1 `DeleteMemberOutcome` | `src/lib/data/types.ts:164` | three arms, no `cascaded` |
| §1.1 no existing type modified | `git diff src/lib/data/types.ts` is `+70 −0` | yes |
| §1.2 `listMembers` unchanged | `src/lib/data/mock/members.ts:19` | name, arity, return type unchanged |
| §1.2 `getMember` unchanged | `src/lib/data/mock/members.ts:23` | unchanged |
| §1.2 `createMember(input: NewMember)` | `src/lib/data/mock/members.ts:46` | yes |
| §1.2 `updateMember(id, patch)` | `src/lib/data/mock/members.ts:77` | yes |
| §1.2 `getMemberReferences(id)` | `src/lib/data/mock/members.ts:106` | yes |
| §1.2 `deleteMember(id)` | `src/lib/data/mock/members.ts:135` | yes |
| §1.2 Prisma parity, four `notWired` bodies | `src/lib/data/prisma/members.ts:26, 31, 37, 42` | same names and arity; parameters `void`-discarded so arity cannot drift |
| §1.2 `seam-parity.test.ts` passes unedited | green in the 79-test run; not in `allowed_paths` | yes |
| §1.2 rule 1 — duplicate email refused, exact match, no throw | `src/lib/data/mock/members.ts:47-49` | `m.email === input.email`, no case folding |
| §1.2 rule 1 — `id` minted, `groupId` literal `null` | `src/lib/data/mock/members.ts:52, 56` | `crypto.randomUUID()`; `groupId: null` written, not taken from input |
| §1.2 rule 1 — writes nothing outside the members collection | `src/lib/data/mock/members.ts:58` | one `push`; no `Account`, no `accounts` import in the file |
| §1.2 rule 2 — duplicate refused against *other* members only | `src/lib/data/mock/members.ts:81` | `m.id !== id && m.email === patch.email` |
| §1.2 rule 2 — three fields written, `id`/`groupId` never | `src/lib/data/mock/members.ts:85-87` | exactly `fullName`, `email`, `role` |
| §1.2 rule 2 — nothing written on refusal | `src/lib/data/mock/members.ts:79, 82` | both returns precede the first assignment at `:85` |
| §1.2 rule 3 — `null` for a member that does not exist | `src/lib/data/mock/members.ts:107` | yes |
| §1.2 rule 3 — pure read, both halves always | `src/lib/data/mock/members.ts:108` → `:152-158` | `filter`/`map`/`sort`/`length`, no assignment |
| §1.2 rule 4 — `deleteMember` computes references itself | `src/lib/data/mock/members.ts:139` | takes no caller input |
| §1.2 rule 4 — read and enforcement are one predicate | `:108` and `:139` both call `referencesTo` at `:152` | cannot drift |
| §1.2 rule 5 — refuses when *either* half is non-empty | `src/lib/data/mock/members.ts:140` | `length > 0 \|\| ownedDeviceCount > 0` |
| §1.2 rule 5 — nothing written on the refusal path | `src/lib/data/mock/members.ts:141` | returns before the `splice` at `:144` |
| §1.2 rule 6 — one row removed, no cascade | `src/lib/data/mock/members.ts:144` | one `splice`; no seat, device, account or request write |
| §1.2 rule 6 — the F-4 comment naming all three declarations | `src/lib/data/mock/members.ts:120-130` | `Account.member` (231), `SeatRequest.requester` (206), `Account.createdBy` (235) |
| §1.3 `memberFullNameSchema`, trim before min | `src/lib/validation/member.ts:10` | yes |
| §1.3 `memberEmailSchema`, `.min(1)` before `.email()` | `src/lib/validation/member.ts:21-26` | order preserved, messages verbatim |
| §1.3 `memberRoleSchema` | `src/lib/validation/member.ts:31` | `z.enum(["USER","MANAGER","ADMIN"])` |
| §1.3 `memberIdSchema` | `src/lib/validation/member.ts:40` | yes |
| §1.3 `createMemberSchema` | `src/lib/validation/member.ts:42` | three fields, no `groupId` |
| §1.3 `updateMemberSchema` | `src/lib/validation/member.ts:52` | `id` plus the three |
| §1.3 `memberIdOnlySchema` | `src/lib/validation/member.ts:60` | yes |
| §1.3 `CreateMemberInput`, `UpdateMemberInput` | `src/lib/validation/member.ts:62-63` | yes |
| §1.3 empty placeholder is how "no role chosen" is refused | `members-manager.tsx:394, 397` and `:455, 462` | `defaultValue=""` and `<option value="">` on **both** dialogs; no `required` attribute |
| §1.4 `MemberFieldName` | `src/actions/members.ts:43` | yes |
| §1.4 `MemberActionError`, four arms | `src/actions/members.ts:53` | `REFERENCED` carries structure and no sentence |
| §1.4 `MemberActionResult<T>` | `src/actions/members.ts:59` | yes |
| §1.4 four actions, `unknown` parameters | `src/actions/members.ts:125, 153, 188, 208` | identical to the design block |
| §1.4 step order 1-5, raw `ZodError` never returned | `:1, 126-127, 129, 138, 143-146`; `fieldErrors` at `:84-95` | first message per field wins at `:92` |
| §1.4 refusal mapping, all three rows | `:141` (`DUPLICATE_EMAIL`), `:219` (`REFERENCED`, passed through unchanged), `:170, 199, 218` (`NOT_FOUND`, including `getMemberReferences` returning `null`) | messages held once each at `:63-64` |
| §1.4 step 5 — `revalidatePath("/members")` AND `revalidatePath("/devices")` on the three write actions | `src/actions/members.ts:143/145` (create), `:174/176` (update), `:224/226` (delete) | six calls, three pairs, exactly as specified |
| §1.4 step 5 — `getMemberReferences` does not revalidate | `src/actions/members.ts:188-206` | no `revalidatePath` in that range; the six calls are all in the three write actions |
| **§1.6 v4 Route rendering — `export const dynamic = "force-dynamic"` at module scope in `src/app/(app)/layout.tsx`** | `src/app/(app)/layout.tsx:3` | **one statement at module scope, between `next/link` import and `const NAV`** |
| §1.5 `MembersPage` default export, server component | `src/app/(app)/members/page.tsx:44` | yes |
| §1.5 `MemberRow` — member, seat codes, `hasAccount` | `src/app/(app)/members/page.tsx:16` | yes |
| §1.5 three existing reads, no new seam function | `src/app/(app)/members/page.tsx:45-49` | `listMembers`, `listSeats`, `listAccounts` under one `Promise.all` |
| §1.5 **no devices import in `page.tsx`** | `page.tsx:4` imports `accounts, members, seats` only | the contractual absence holds |
| §1.5 `MembersManager({ rows })`, no client copy of the list | `members-manager.tsx:100`; `router.refresh()` at `:144, 164, 216` | `rows` is a prop |
| §1.5 two-branch delete, chosen before anything is confirmed | `members-manager.tsx:176-194` | read at `:180`, refusal `:189-192`, confirm `:193`, `NOT_FOUND` → `:184` opens nothing |
| §1.5 refused dialog has no confirm control | `members-manager.tsx:509-549` | one `Button`, `member-delete-refused-dismiss` at `:543` |
| §1.5 sign-in column reads `Account` | `page.tsx:51, 67`; rendered at `members-manager.tsx:333-335` | `account` / `no account` |
| §1.5 Edit and Delete on every row, unconditionally | `members-manager.tsx:346-369` | no state predicate wraps either |
| §3 `store.ts` gains one binding, alters no other line | `src/lib/data/mock/store.ts:53` | the one deletion is the import the new binding extends |
| §3 `mock/members.ts` repointed to `./store` with `seats` and `devices` | `src/lib/data/mock/members.ts:17` | reads the arrays; calls neither `listSeats()` nor `listDevices()` |

## R7 detail

All 41 selectors from section 6's main table plus the 5 DEV-01 selectors in section 6.3 exist in the markup:
- 32 matched literally or via template in `members-manager.tsx` and `page.tsx`.
- 9 matched as prefix-derived in `DataTable.tsx` and `EntityFormDialog.tsx`.
- 5 DEV-01 selectors matched in `devices-manager.tsx:273, 448, 452, 457, 462`.
**46 of 46 located, 0 missing.**

## R8 detail

Both IDs in `ticket.yaml:invariants_touched`, reasoned individually and re-run against the working tree via execution:

| Invariant | Held by | Citation |
|---|---|---|
| **INV-08** — no self-signup; accounts are created by Manager or Admin only | Held by the **absence of a code path**. `NewMember` (`types.ts:108`) has three fields and none is a credential; `createMemberSchema` (`member.ts:42`) has the same three and strips unknown keys; `createMember` (`mock/members.ts:46-60`) performs one `members.push` and touches nothing else. `mock/store.ts` does not export `accounts`. **Executed:** creating an ADMIN member grew the members collection by one and left `listAccounts()` deeply equal to its non-empty prior value. | `src/lib/data/mock/members.ts:46-60`; `src/lib/data/types.ts:108`; `members-manager.tsx:411` |
| **INV-12** — a Member may not be deleted while they occupy a seat or own a device; refused, not cascaded | `deleteMember` at `src/lib/data/mock/members.ts:135-146` computes references itself at `:139`, refuses at `:141` when either half is non-empty, and returns before the splice at `:144`. UI two-dialog split is only an affordance; seam enforces. **Executed, four cases:** (1) seat-occupying member → refused `REFERENCED` `{occupiedSeatCodes: ['SEAT-A-01', 'SEAT-A-04'], ownedDeviceCount: 2}`, seats and devices unchanged; (2) **device half alone** → refused `{occupiedSeatCodes: [], ownedDeviceCount: 1}`; (3) clean unreferenced member → **deleted**, proving predicate; (4) non-existent member → `NOT_FOUND`. | `src/lib/data/mock/members.ts:135-146`; predicate `:152-158`; action `src/actions/members.ts:208-227` |

**INV-01, INV-05, INV-06 stay discharged by ADR-005.** Grep of added lines in `src/` confirms zero mutations to `seats` or `devices` arrays or fields.

## Findings

None. No check failed, so no row is routed and `rework_count` stays `0`.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | — | — | — |

### Observations

1. **F-9 is resolved and verified implemented.** §1.6's dynamic export causes `next build` to report all seven `(app)` routes as `ƒ (Dynamic)`, and `pnpm test` + `pnpm typecheck` + `pnpm lint` all exit 0.
2. **F-10 (sizing table unit definition)** is routed to the steward in `99-questions.md` F-10.
3. **F-8 (application-wide revalidation)** remains open and routed to a human; its rendering symptom is incidentally cleared by `force-dynamic`.
4. **Pre-existing docs audit finding on ADR-006** is an artefact of branching from `55054cb` before ADR-006 merged to `main`; a rebase before `/ship` resolves it.

## Verdict

**`PASS`.** Nine checks, nine citations, no finding. `rework_count` stays `0`: this cycle implemented design version 4's contract item §1.6, which resolved F-9.

The ticket advances to **`QA`**.

```
REVIEW passed. Run /qa MEM-01 in a FRESH session, discarded after the verdict.
```
