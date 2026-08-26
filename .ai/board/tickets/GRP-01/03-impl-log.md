---
ticket: GRP-01
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-26T01:40:49Z
inputs_read: [ .ai/board/tickets/GRP-01/02-design.md, .ai/board/tickets/GRP-01/01-story.md, .ai/board/tickets/GRP-01/ticket.yaml ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# GRP-01 — Group CRUD UI — implementation log

## Files touched

Eight files. All eight are in `allowed_paths`; the two paths in `allowed_paths` this stage does not
touch are `tests/unit/groups.test.ts` and `tests/e2e/groups.spec.ts`, which are QA's (RULE-05).

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/lib/data/types.ts` | modified | The five DTOs the seam functions take and return. Additive beside `Group`, which does not change | §1.1 |
| `src/lib/data/mock/store.ts` | modified | `mock/groups.ts` becomes a writing module and must write through the store binding, not `../fixtures` | §3 |
| `src/lib/data/mock/groups.ts` | modified | The seam's half of every rule in §3.1 — the four functions and the three predicates they share | §1.2 |
| `src/lib/data/prisma/groups.ts` | modified | Four `notWired` bodies at identical arity, so `seam-parity.test.ts` fails on the first drift | §1.2 |
| `src/lib/validation/group.ts` | created | The runtime half of the contract: what a form may submit, and the `"" → null` parent mapping | §1.3 |
| `src/actions/groups.ts` | created | Three write actions and one read, each parsing `unknown` and returning a typed result | §1.4 |
| `src/app/(app)/groups/page.tsx` | modified | Replaces the Phase B scaffold (F-7): one seam read flattened into pre-order `GroupRow[]` | §1.5 |
| `src/app/(app)/groups/groups-manager.tsx` | created | The four dialogs, the row controls, and the action calls | §1.5 |

**The first five files arrived already written**, by an `/implement` session that ran on this branch
and did not finish. That session no longer exists, so this one did not inherit its reasoning. Every
one of the five was read in full against design section 1 before being adopted, and the checks in
*Verification run* below were executed against the whole tree rather than against the three files
this session authored. Nothing in the five was changed: they implement §1.1, §1.2 and §1.3 as
written, including all six numbered mock rules and their stated ordering. This is recorded because
the reviewer diffs intent against code and would otherwise have no way to know that half the diff
predates the log's author.

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.1 `NewGroup` | `src/lib/data/types.ts:216` | |
| §1.1 `GroupPatch` | `src/lib/data/types.ts:227` | One patch carries both editable fields, so a rename and a move reach the same uniqueness check |
| §1.1 `GroupReferences` | `src/lib/data/types.ts:243` | |
| §1.1 `CreateGroupOutcome` | `src/lib/data/types.ts:255` | |
| §1.1 `UpdateGroupOutcome` | `src/lib/data/types.ts:267` | Four distinct reasons; `ANCESTOR_CYCLE` and `DUPLICATE_NAME_IN_PARENT` stay distinguishable end to end |
| §1.1 `DeleteGroupOutcome` | `src/lib/data/types.ts:286` | No `cascaded` arm — Q-1 rejected both the cascade and the reparent |
| §1.2 `createGroup` | `src/lib/data/mock/groups.ts:49`, `src/lib/data/prisma/groups.ts:35` | Rule 2: `PARENT_NOT_FOUND` first |
| §1.2 `updateGroup` | `src/lib/data/mock/groups.ts:86`, `src/lib/data/prisma/groups.ts:40` | Rules 2 and 3: parent, then cycle, then sibling name |
| §1.2 `getGroupReferences` | `src/lib/data/mock/groups.ts:121`, `src/lib/data/prisma/groups.ts:46` | A pure read; `null` for a group that does not exist |
| §1.2 `deleteGroup` | `src/lib/data/mock/groups.ts:148`, `src/lib/data/prisma/groups.ts:51` | Rule 6: recomputes its own references and trusts no caller |
| §1.2 rule 1 — checks before the first write | `mock/groups.ts:49,86,148` | Every refusal returns before any assignment |
| §1.2 rule 4 — the bounded cycle walk | `src/lib/data/mock/groups.ts:219` | Refuses past `groups.length` steps, so a corrupt store fails a test rather than hanging the server |
| §1.2 rule 5 — one sibling-uniqueness predicate | `src/lib/data/mock/groups.ts:200` | `excludeId` is `null` on create, the group's own id on update |
| §1.2 the shared references read | `src/lib/data/mock/groups.ts:176` | AC-12's list and AC-13's count computed together, so the read and the enforcement cannot drift |
| §1.2 the store alias | `src/lib/data/mock/store.ts:65` | Same array object as `fixtures.ts`, not a clone |
| §1.3 the five schemas | `src/lib/validation/group.ts:17,19,30,39,44,51` | `groupParentIdSchema` puts `z.literal("")` first: a top-level group is not a validation failure |
| §1.4 `GroupFieldName`, `GroupActionError`, `GroupActionResult` | `src/actions/groups.ts:43,52,60` | `HAS_CHILDREN` carries structure and no sentence |
| §1.4 the four message strings | `src/actions/groups.ts:66-70` | Verbatim from the design's table |
| §1.4 `createGroup` | `src/actions/groups.ts:140` | |
| §1.4 `updateGroup` | `src/actions/groups.ts:175` | |
| §1.4 `getGroupReferences` | `src/actions/groups.ts:205` | The only action that does not revalidate |
| §1.4 `deleteGroup` | `src/actions/groups.ts:229` | |
| §1.4 step 5 — `revalidatePath("/groups")`, three writes only | `src/actions/groups.ts:162,195,245` | `/members` deliberately absent; the note at `src/actions/groups.ts:16` carries the reason and names `GRP-02` as the ticket that must add it |
| §1.5 `GroupRow` | `src/app/(app)/groups/page.tsx:14` | |
| §1.5 the page — one seam read, flattened here | `src/app/(app)/groups/page.tsx:46` | Pre-order walk from the roots, siblings sorted by name |
| §1.5 decision 1 — create control above the table | `groups-manager.tsx:308` | Present when the tree is empty |
| §1.5 decision 2 — both parent selects list full paths | `groups-manager.tsx:130` (`ParentOptions`) | Option value is the id, label is the path |
| §1.5 decision 3 — the edit select filters nothing out | `groups-manager.tsx:130`, used at `:450` | Same component as create, so AC-8 stays reachable through the UI |
| §1.5 decision 4 — the delete branch is chosen before anything is confirmed | `groups-manager.tsx:218` (`requestDelete`), `:238` (`submitDelete`) | A late `HAS_CHILDREN` closes the confirmation and opens the refusal |
| §1.5 decision 5 — the confirmation names the detach count | `groups-manager.tsx:484` | Bare, in its own element |
| §1.5 Edit and Delete on every row | `groups-manager.tsx:376,385` | Unconditional |
| §2 permission model | `src/actions/groups.ts:144,179,211,235` | Four step-3 comments, one per action, at the exact line the `ADMIN` gate belongs on |

## Deviations from the design

`none`.

Two implementation choices are worth naming because a reader might mistake either for one:

1. **The name cell wraps the testid element in an indent span** (`groups-manager.tsx:337-339`). §1.5
   says `depth` drives the name cell's indent and nothing else; the padding is therefore on an outer
   `<span>` and `groups-row-<path>-name` is on an inner one, so the element QA asserts against
   contains the name and no whitespace of its own.
2. **`ParentOptions` is one local component used by both selects** rather than the option list being
   written out twice. §1.5 decision 3 turns on the two selects offering the *same* options, and one
   component is the strongest available statement that they cannot drift.

## Invariants

`invariants_touched` is `[]`, narrowed from `[INV-12]` by the operator's answer to Q-2. The template
asks for the sentence that shows the case was considered rather than for the word *unaffected*, so:

| ID | Still holds because |
|----|---------------------|
| `INV-12` | Not engaged, and structurally so. `deleteGroup` deletes no member — it assigns `null` to `Member.groupId` on rows that keep existing (`mock/groups.ts:157-162`), and `DeleteGroupOutcome` has no arm that could report having deleted one. AC-9 asserts it from the outside; the shape of the contract is what makes it true. |
| — | AC-10 is held by an absence that is checkable: `mock/groups.ts` imports `groups` and `members` from `./store` and nothing else, so there is no path from this ticket's code to a seat or a device. An import of `seats` or `devices` in that file is a review finding under R8 regardless of what it is used for (§3.1). |

## Verification run

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | |
| `pnpm lint` | 0 | |
| `pnpm test` | 0 | 7 files, 107 tests. Includes `seam-parity.test.ts`, which already had `groups` in `PAIRS` and now checks the four added names against the Prisma side. It was not edited and is not in `allowed_paths` |
| `pnpm build` | 0 | Run beyond the gate. `/groups` builds as `ƒ (Dynamic)`, which is the layout's `force-dynamic` reaching this route — §1.4 relies on it and does not set it |
| `git diff --name-only` subset of `allowed_paths` | yes | Eight files, listed above. None of the four deliberately-absent paths in §5 is touched |

## Testability contract

All 36 rows of design section 6. Eight of them are produced by a shared component from a
`testIdPrefix` rather than written literally, and those are cited at the prefix.

| `data-testid` | Exists at |
|---------------|-----------|
| `groups-page` | `src/app/(app)/groups/page.tsx:85` |
| `groups-create-open` | `groups-manager.tsx:308` |
| `groups-table` | `groups-manager.tsx:328` via `DataTable` `testIdPrefix="groups"` |
| `groups-empty` | `groups-manager.tsx:328` via `DataTable` `testIdPrefix="groups"` |
| `groups-action-error` | `groups-manager.tsx:315` |
| `groups-row-<path>` | `groups-manager.tsx:327,328` — `rowKey` is `r.path` |
| `groups-row-<path>-name` | `groups-manager.tsx:338` |
| `groups-row-<path>-parent` | `groups-manager.tsx:348` |
| `groups-row-<path>-children` | `groups-manager.tsx:358` |
| `groups-row-<path>-edit` | `groups-manager.tsx:376` |
| `groups-row-<path>-delete` | `groups-manager.tsx:385` |
| `group-create-dialog` | `groups-manager.tsx:401` via `EntityFormDialog` `testIdPrefix="group-create"` |
| `group-create-name` | `groups-manager.tsx:405` |
| `group-create-name-error` | `groups-manager.tsx:406` |
| `group-create-parent` | `groups-manager.tsx:414` |
| `group-create-parent-error` | `groups-manager.tsx:418` |
| `group-create-submit` | `groups-manager.tsx:401` via `EntityFormDialog` |
| `group-create-cancel` | `groups-manager.tsx:401` via `EntityFormDialog` |
| `group-edit-dialog` | `groups-manager.tsx:428` via `EntityFormDialog` `testIdPrefix="group-edit"` |
| `group-edit-name` | `groups-manager.tsx:439` |
| `group-edit-name-error` | `groups-manager.tsx:441` |
| `group-edit-parent` | `groups-manager.tsx:450` |
| `group-edit-parent-error` | `groups-manager.tsx:455` |
| `group-edit-error` | `groups-manager.tsx:458` |
| `group-edit-submit` | `groups-manager.tsx:428` via `EntityFormDialog` |
| `group-edit-cancel` | `groups-manager.tsx:428` via `EntityFormDialog` |
| `group-delete-dialog` | `groups-manager.tsx:468` |
| `group-delete-message` | `groups-manager.tsx:472` |
| `group-delete-members` | `groups-manager.tsx:484` |
| `group-delete-confirm` | `groups-manager.tsx:500` |
| `group-delete-cancel` | `groups-manager.tsx:490` |
| `group-delete-refused-dialog` | `groups-manager.tsx:514` |
| `group-delete-refused-message` | `groups-manager.tsx:517` |
| `group-delete-refused-children` | `groups-manager.tsx:526` |
| `group-delete-refused-dismiss` | `groups-manager.tsx:535` |

Nothing outside this table renders a `data-testid` on this surface. The `FieldError` helper at
`groups-manager.tsx:87` renders whichever id its caller passes, and its four callers are the four
`-error` rows above.

## Open questions

1. **The seed's `Platform` sits under `Engineering`, so its row path is `Engineering/Platform`.**
   §6.2 tells QA the seed's shape and §6.1 tells it the key is the path, but the two facts are one
   indirection apart and the combined string appears nowhere. Recorded here so the reviewer reading
   for R7 does not have to derive it either.
2. **`Q-5` is still open** — whether the ancestor-cycle refusal should become a domain invariant. It
   is implemented as a seam rule (`mock/groups.ts:219`) either way, so nothing here waits on the
   answer; if it becomes an invariant, `invariants_touched` acquires an ID and this file's Invariants
   table gains a row, without the code changing.
3. **F-5 remains a live disagreement between the design and `prisma/schema.prisma:153`.** The seam
   refuses a delete that has children on both sides, so the behaviour is correct today. The moment
   the Prisma implementation is wired against the schema as it currently stands, `onDelete: SetNull`
   would perform Q-1's rejected reparent for any caller reaching the database another way. It is a
   human's under RULE-09 and this ticket does not propose the edit.
