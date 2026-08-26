---
ticket: GRP-02
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-26T04:02:11Z
inputs_read: [ .ai/board/tickets/GRP-02/02-design.md, .ai/board/tickets/GRP-02/01-story.md, .ai/board/tickets/GRP-02/ticket.yaml, .ai/steward/context.md, .ai/standards/coding-standards.md, "src/** within allowed_paths, plus the four files section 5 names as deliberately absent" ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# GRP-02 — implementation log

**Eight of the ten `allowed_paths` are touched. The two that are not are QA's**:
`tests/unit/member-groups.test.ts` and `tests/e2e/member-groups.spec.ts` are listed in section 5 as
`new — QA`, and the test plan is written at the QA stage against section 6, not here.

**No contract item was amended and nothing was consulted.** Section 1 was copy-pasteable as the
design promised, and every field name in the diff appears in section 1 first (RULE-04).

## Files touched

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/lib/data/types.ts` | modified | The outcome type the seam function returns. Additive — `Member`, `NewMember` and `MemberPatch` are byte-identical, which is what keeps the ticket out of the XL band | §1.1 |
| `src/lib/data/mock/members.ts` | modified | The one function that writes `Member.groupId` in the direction that carries information, plus `groups` on the `./store` import so AC-6's refusal can be answered from stored data | §1.2 |
| `src/lib/data/prisma/members.ts` | modified | The `notWired` stub. Identical name and arity, or `seam-parity.test.ts` fails | §1.2 |
| `src/lib/validation/member.ts` | modified | `memberGroupIdSchema` and `assignMemberToGroupSchema`. A new schema rather than an import of `groupParentIdSchema`, which is the whole of F-4 | §1.3 |
| `src/actions/members.ts` | modified | The action, and one additive member each on `MemberFieldName`, `MEMBER_FIELD_NAMES` and `MemberActionError` | §1.4 |
| `src/actions/groups.ts` | modified | Three `revalidatePath("/members")` lines, and the head comment GRP-01 wrote against this ticket replaced rather than deleted | §1.5 |
| `src/app/(app)/members/page.tsx` | modified | The fourth seam read and the two projections — `groupName` off a name map, `groupOptions` off the pre-order walk | §1.6 |
| `src/app/(app)/members/members-manager.tsx` | modified | The Group column, the unconditional `Assign group` button, the assign dialog, and `submitAssign` | §1.7 |

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.1 `AssignMemberToGroupOutcome` | `src/lib/data/types.ts:226` | Verbatim, doc comment included. Placed between `DeleteMemberOutcome` and `Group`, so a reader meets it with the other Member outcomes |
| §1.2 `assignMemberToGroup` (mock) | `src/lib/data/mock/members.ts:128` | The body is the design's, character for character. Rule 5's `groups` import is at line 25 |
| §1.2 `assignMemberToGroup` (prisma) | `src/lib/data/prisma/members.ts:38` | Both parameters declared and discarded with `void`, as the six functions beside it |
| §1.3 `memberGroupIdSchema` | `src/lib/validation/member.ts:75` | |
| §1.3 `assignMemberToGroupSchema` | `src/lib/validation/member.ts:78` | `AssignMemberToGroupInput` at line 85. `createMemberSchema`, `updateMemberSchema` and `memberIdOnlySchema` are unchanged |
| §1.4 `MemberFieldName` | `src/actions/members.ts:44` | `"groupId"` appended; `MEMBER_FIELD_NAMES` at line 72 kept in step, which is what makes `fieldErrors` route the Zod message to the group field |
| §1.4 `GROUP_NOT_FOUND` arm | `src/actions/members.ts:60` | `GROUP_GONE_MESSAGE` at line 70 |
| §1.4 `assignMemberToGroup` action | `src/actions/members.ts:197` | One `revalidatePath("/members")` at line 221 and no `/devices` — the design's reason is carried in the comment, so the single path does not read as an omission beside the two-path actions above it |
| §1.5 three revalidate lines | `src/actions/groups.ts:178, 214, 267` | `createGroup`, `updateGroup`, `deleteGroup`. `getGroupReferences` still does not revalidate |
| §1.6 `MemberRow.groupName` | `src/app/(app)/members/page.tsx:36`, composed at `:107` | `?? null` on the map lookup, so an unresolvable `groupId` renders the empty state rather than the id |
| §1.6 `GroupOption` | `src/app/(app)/members/page.tsx:46`, composed at `:140` | Downward pre-order walk from the roots, buckets sorted by `localeCompare` — the same walk `groups/page.tsx` performs |
| §1.6 fourth seam read | `src/app/(app)/members/page.tsx:82` | Inside the existing `Promise.all`. No seam function was added for it |
| §1.7 item 1 — Group column | `src/app/(app)/members/members-manager.tsx:390` | Between `Role` and `Seats occupied`, as specified |
| §1.7 item 2 — assign button | `src/app/(app)/members/members-manager.tsx:452` | Unconditional, between `Edit` and `Delete` |
| §1.7 item 3 — assign dialog | `src/app/(app)/members/members-manager.tsx:574` | `EntityFormDialog`, `testIdPrefix="member-assign"`. Placeholder always rendered; nothing filtered from the option list; `defaultValue` keyed on the member id |
| §1.7 item 4 — `submitAssign` | `src/app/(app)/members/members-manager.tsx:203` | `submitEdit`'s shape. `fieldMessages` gains `GROUP_NOT_FOUND` at line 69; `looseMessage` is unchanged |

## Deviations from the design

**none.**

Three things are worth naming as *not* deviations, because each is a place where the diff is larger
or smaller than section 1 reads and a reviewer would be right to look:

1. **`src/actions/groups.ts` is longer than "three lines".** The three `revalidatePath` calls are
   three lines; §1.5 also instructs that the head comment be **replaced, not deleted**, and that the
   replacement keep F-3's three reasons. It does, and it keeps GRP-01's original paragraph as the
   record of why the path was absent — a reason that survives is what makes its arrival checkable.
2. **`SELECT_A_GROUP_LABEL` and `NO_GROUP` are named constants** rather than inline literals. Both
   strings are fixed by section 6 (`none`, `Select a group`) and both are asserted by QA; the file's
   existing `NO_SEATS` sets the precedent, and its comment gives the reason — a second spelling would
   fail a criterion silently. No string differs from the one section 6 names.
3. **`tests/unit/member-groups.test.ts` and `tests/e2e/member-groups.spec.ts` do not exist yet.**
   They are in `allowed_paths` and they are QA's, written at the QA stage against section 6. An
   empty diff on both is the expected state at REVIEW.

## Invariants

`invariants_touched` is `[]`, confirmed by the `ba` at SPEC after walking all eleven issued IDs. The
one that needed an argument was INV-12, and the implementation is where that argument becomes
checkable rather than reasoned:

| ID | Still holds because |
|----|---------------------|
| `INV-12` | INV-12 governs member **deletion**. `assignMemberToGroup` contains one assignment statement, `member.groupId = groupId`, and no `splice`; `AssignMemberToGroupOutcome` has no arm that could report a deletion, so a caller cannot be told one happened even by a wrong implementation. `deleteMember` and `referencesTo` are untouched, and the diff on `mock/members.ts` adds no import beyond `groups` |
| — | **No other invariant is reached, and the mechanism is the import list.** `mock/members.ts` imports `devices`, `groups`, `members` and `seats`; `assignMemberToGroup` names `members` and `groups` and nothing else, so there is no path from it to a seat, a device or a room. `rooms` is still not imported at all. That is section 3.1's claim, and it is a property of the file rather than of a test |

## Verification run

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | |
| `pnpm lint` | 0 | 3 pre-existing `no-unused-vars` **warnings**, all in GRP-01's test files (`tests/e2e/groups.spec.ts:110`, `tests/unit/groups.test.ts:53,204`). Neither file is in this ticket's `allowed_paths` and neither was touched |
| `pnpm test` | 0 | 126 passed, 8 files. Includes `tests/unit/seam-parity.test.ts`, which compared the new mock/prisma pair automatically — `members` was already in `PAIRS` and that file needed no edit, as §3 predicted |
| `pnpm build` | 0 | 10 routes, no error |
| `pnpm exec playwright test tests/e2e/members.spec.ts` | 0 | **16 passed.** F-7 asserted that a new column does not break MEM-01's spec because it addresses every cell by testid; this measures it rather than trusting it, and it is the cheapest possible check against the one regression this ticket could plausibly cause |
| `git diff --name-only` subset of `allowed_paths` | yes | 8 files, all listed. The two absent are QA's |

**One observation from the build that belongs to nobody's ticket and is recorded because it
contradicts a merged artifact.** MEM-01's finding F-8 says *every application route builds as
`○ (Static)` and four of them are revalidated by nothing*. That is no longer true: `/members`,
`/groups`, `/devices`, `/seats`, `/rooms`, `/requests` and `/layout-designer` all build as
`ƒ (Dynamic)` on this tree. It is not this ticket's to fix and no criterion here depends on it —
noted so a reader who checks F-8 against a build does not conclude the log is wrong.

## Testability contract

Every testid in section 6's *what this ticket adds* table, and where it now exists. `<email>` is the
member's email exactly as stored.

| `data-testid` | Exists at |
|---------------|-----------|
| `members-row-<email>-group` | `src/app/(app)/members/members-manager.tsx:390` |
| `members-row-<email>-assign` | `src/app/(app)/members/members-manager.tsx:452` |
| `member-assign-dialog` | `src/app/(app)/members/members-manager.tsx:580` — composed by `EntityFormDialog` from `testIdPrefix="member-assign"` (`src/components/shared/EntityFormDialog.tsx:35`) |
| `member-assign-group` | `src/app/(app)/members/members-manager.tsx:591` |
| `member-assign-group-error` | `src/app/(app)/members/members-manager.tsx:608` — rendered by `FieldError`, absent while the group is accepted |
| `member-assign-empty` | `src/app/(app)/members/members-manager.tsx:615` — rendered only when `groupOptions` is empty |
| `member-assign-submit` | composed by `EntityFormDialog` (`src/components/shared/EntityFormDialog.tsx:42`) |
| `member-assign-cancel` | composed by `EntityFormDialog` (`src/components/shared/EntityFormDialog.tsx:39`) |
| `member-assign-error` | `src/app/(app)/members/members-manager.tsx:621` — the loose message, for a member already gone |

**No testid was renamed and none was removed.** The five MEM-01 cells section 6.4 restates
(`-name`, `-email`, `-role`, `-seats`, `-signin`) are untouched, which the 16-test e2e run above
demonstrates rather than asserts.

**There is no testid for a control that removes a member from a group, because there is no such
control.** Out-of-scope item 2, `Q-4`, F-4 — and the mechanism is `groupId: string` in the seam
signature and `memberGroupIdSchema` in the validation layer, neither of which can express a null.

## Open questions

**Nothing is unresolved and nothing is blocked.** Three items are carried forward unchanged, none of
them this stage's to answer:

- **`Q-2` — may a Manager assign?** Still open, still the operator's. The permission check is absent
  by specification and the insertion point carries the comment section 2 asks for, at
  `src/actions/members.ts:203`. Both readings are recorded there and neither is chosen.
- **`Q-4` — is there a third verb?** Still open, still the operator's, and still unbuildable through
  this contract by construction rather than by discipline.
- **`Q-5` — may a Member belong to more than one Group?** Still open. AC-7 is implemented as the
  glossary's narrower reading, which section 4 records would not survive a many-to-many answer.

One thing a reviewer should not have to rediscover: **`revalidatePath("/devices")` is deliberately
absent from `assignMemberToGroup`** while the three actions above it in the same file all carry it.
The design's reason is in the code comment at `src/actions/members.ts:217-220` — `/devices` renders
member *names* and no group data, and this action changes no name. The asymmetry is intended and is
the one line in this diff most likely to read as an oversight.
