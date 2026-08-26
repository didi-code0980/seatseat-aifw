---
ticket: GRP-01
stage: QA
agent: qa
produced_at: 2026-08-26T01:55:40Z
inputs_read: [ .ai/board/tickets/GRP-01/01-story.md, .ai/board/tickets/GRP-01/05-test-plan.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# Test report: GRP-01 — Group CRUD UI

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | 0 | 126 | 0 | 0 |
| e2e | `pnpm test:e2e` | 0 | 82 | 0 | 0 |

## AC coverage

| AC | Test name | Result |
|---|---|---|
| AC-1 | AC-1: every group is listed with its parent and child relationships intact (unit) | PASS |
| AC-1 | AC-1: groups are listed as the tree they are, beneath parent or at top level, with create control (e2e) | PASS |
| AC-2 | AC-2: creates top-level group with parentId null and no children (unit) | PASS |
| AC-2 | AC-2: a group is created at the top level without reloading (e2e) | PASS |
| AC-3 | AC-3: creates child group referencing parent group id (unit) | PASS |
| AC-3 | AC-3: a group is created as the child of an existing group (e2e) | PASS |
| AC-4 | AC-4: creation is refused when the name is missing or blank (e2e) | PASS |
| AC-4a | AC-4a: duplicate name under same parent is refused with DUPLICATE_NAME_IN_PARENT (unit) | PASS |
| AC-4a | AC-4a: duplicate name at top level (parentId null) is also refused (unit) | PASS |
| AC-4a | AC-4a: creation is refused when a group with that name already sits under the same parent (e2e) | PASS |
| AC-4b | AC-4b: identical group names under different parents are both created successfully (unit) | PASS |
| AC-4b | AC-4b: the same name is permitted beneath a different parent (e2e) | PASS |
| AC-5 | AC-5: updates name while preserving parentId and other groups (unit) | PASS |
| AC-5 | AC-5: a group is renamed, keeping its place in the tree (e2e) | PASS |
| AC-5a | AC-5a: rename to sibling name is refused with DUPLICATE_NAME_IN_PARENT (unit) | PASS |
| AC-5a | AC-5a: renaming is refused when a sibling already holds the new name (e2e) | PASS |
| AC-6 | AC-6: moves group to new parent, preserving its own children (unit) | PASS |
| AC-6 | AC-6: a group is moved to a different parent with its children (e2e) | PASS |
| AC-6a | AC-6a: move colliding with destination sibling is refused with DUPLICATE_NAME_IN_PARENT (unit) | PASS |
| AC-6a | AC-6a: a move is refused when destination parent already holds a group with that name (e2e) | PASS |
| AC-7 | AC-7: moves child group to top level with parentId null (unit) | PASS |
| AC-7 | AC-7: a group is moved to the top level (e2e) | PASS |
| AC-8 | AC-8: setting parent to self is refused with ANCESTOR_CYCLE (unit) | PASS |
| AC-8 | AC-8: setting parent to a descendant is refused with ANCESTOR_CYCLE (unit) | PASS |
| AC-8 | AC-8: a group may not be made its own ancestor (e2e) | PASS |
| AC-9 | AC-9: group operations never delete a Member (INV-12) (unit) | PASS |
| AC-9 | AC-9: nothing on this surface deletes a Member (INV-12) (e2e) | PASS |
| AC-10 | AC-10: group operations never touch seats, devices, or occupancies (unit) | PASS |
| AC-10 | AC-10: nothing on this surface touches a seat, a device, or an occupancy (e2e) | PASS |
| AC-11 | AC-11: deletes empty group, returning membersDetached 0 (unit) | PASS |
| AC-11 | AC-11: deleting non-existent group returns NOT_FOUND (unit) | PASS |
| AC-11 | AC-11: a group with no children and no members is deleted after confirmation (e2e) | PASS |
| AC-12 | AC-12: delete is refused with HAS_CHILDREN (unit) | PASS |
| AC-12 | AC-12: deleting a group that has child groups is refused (e2e) | PASS |
| AC-13 | AC-13: deleting Platform detaches its members to groupId null without modifying other member fields (unit) | PASS |
| AC-13 | AC-13: deleting a group that has members detaches them (RUNS LAST) (e2e) | PASS |

## Failures

None. All 126 unit tests and 82 end-to-end tests passed.

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| INV-12 | Held | `tests/unit/groups.test.ts` (AC-9, AC-13) and `tests/e2e/groups.spec.ts` (AC-9, AC-13) confirm no members are deleted and members are safely detached with null `groupId`. |

## Selector gaps encountered

None. All selectors from `02-design.md` section 6 exist and functioned as designed.

## Verdict

`PASS`
