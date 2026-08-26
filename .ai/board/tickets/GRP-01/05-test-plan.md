---
ticket: GRP-01
stage: QA
agent: qa
produced_at: 2026-08-26T01:55:30Z
inputs_read: [ .ai/board/tickets/GRP-01/01-story.md, .ai/board/tickets/GRP-01/02-design.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# Test plan: GRP-01 — Group CRUD UI

Written by `qa` from `01-story.md` and section 6 of `02-design.md`. `src/**` was not read (RULE-05).

## Coverage map

Every acceptance criterion from `01-story.md` maps to at least one named test.

| AC | Test name | Level | Selectors used |
|---|---|---|---|
| AC-1 | AC-1: every group is listed with its parent and child relationships intact | unit | — |
| AC-1 | AC-1: groups are listed as the tree they are, beneath parent or at top level, with create control | e2e | `groups-page`, `groups-table`, `groups-row-<path>`, `groups-row-<path>-name`, `groups-row-<path>-parent`, `groups-row-<path>-children`, `groups-create-open` |
| AC-2 | AC-2: creates top-level group with parentId null and no children | unit | — |
| AC-2 | AC-2: a group is created at the top level without reloading | e2e | `groups-create-open`, `group-create-dialog`, `group-create-name`, `group-create-submit`, `groups-row-<path>`, `groups-row-<path>-parent`, `groups-row-<path>-children` |
| AC-3 | AC-3: creates child group referencing parent group id | unit | — |
| AC-3 | AC-3: a group is created as the child of an existing group | e2e | `groups-create-open`, `group-create-dialog`, `group-create-name`, `group-create-parent`, `group-create-submit`, `groups-row-<path>`, `groups-row-<path>-parent`, `groups-row-<path>-children` |
| AC-4 | AC-4: creation is refused when the name is missing or blank | e2e | `groups-create-open`, `group-create-dialog`, `group-create-name`, `group-create-submit`, `group-create-name-error`, `group-create-cancel` |
| AC-4a | AC-4a: duplicate name under same parent is refused with DUPLICATE_NAME_IN_PARENT | unit | — |
| AC-4a | AC-4a: duplicate name at top level (parentId null) is also refused | unit | — |
| AC-4a | AC-4a: creation is refused when a group with that name already sits under the same parent | e2e | `group-create-dialog`, `group-create-name`, `group-create-parent`, `group-create-submit`, `group-create-name-error`, `group-create-cancel` |
| AC-4b | AC-4b: identical group names under different parents are both created successfully | unit | — |
| AC-4b | AC-4b: the same name is permitted beneath a different parent | e2e | `group-create-dialog`, `group-create-name`, `group-create-parent`, `group-create-submit`, `groups-row-<path>` |
| AC-5 | AC-5: updates name while preserving parentId and other groups | unit | — |
| AC-5 | AC-5: a group is renamed, keeping its place in the tree | e2e | `groups-row-<path>-edit`, `group-edit-dialog`, `group-edit-name`, `group-edit-submit`, `groups-row-<path>` |
| AC-5a | AC-5a: rename to sibling name is refused with DUPLICATE_NAME_IN_PARENT | unit | — |
| AC-5a | AC-5a: renaming is refused when a sibling already holds the new name | e2e | `groups-row-<path>-edit`, `group-edit-dialog`, `group-edit-name`, `group-edit-submit`, `group-edit-name-error`, `group-edit-cancel` |
| AC-6 | AC-6: moves group to new parent, preserving its own children | unit | — |
| AC-6 | AC-6: a group is moved to a different parent with its children | e2e | `groups-row-<path>-edit`, `group-edit-dialog`, `group-edit-parent`, `group-edit-submit`, `groups-row-<path>` |
| AC-6a | AC-6a: move colliding with destination sibling is refused with DUPLICATE_NAME_IN_PARENT | unit | — |
| AC-6a | AC-6a: a move is refused when destination parent already holds a group with that name | e2e | `groups-row-<path>-edit`, `group-edit-dialog`, `group-edit-parent`, `group-edit-submit`, `group-edit-name-error`, `group-edit-cancel` |
| AC-7 | AC-7: moves child group to top level with parentId null | unit | — |
| AC-7 | AC-7: a group is moved to the top level | e2e | `groups-row-<path>-edit`, `group-edit-dialog`, `group-edit-parent`, `group-edit-submit`, `groups-row-<path>`, `groups-row-<path>-parent` |
| AC-8 | AC-8: setting parent to self is refused with ANCESTOR_CYCLE | unit | — |
| AC-8 | AC-8: setting parent to a descendant is refused with ANCESTOR_CYCLE | unit | — |
| AC-8 | AC-8: a group may not be made its own ancestor | e2e | `groups-row-<path>-edit`, `group-edit-dialog`, `group-edit-parent`, `group-edit-submit`, `group-edit-parent-error`, `group-edit-cancel` |
| AC-9 | AC-9: group operations never delete a Member (INV-12) | unit | — |
| AC-9 | AC-9: nothing on this surface deletes a Member (INV-12) | e2e | `members-page`, `members-row-<email>-name`, `members-row-<email>-seats` |
| AC-10 | AC-10: group operations never touch seats, devices, or occupancies | unit | — |
| AC-10 | AC-10: nothing on this surface touches a seat, a device, or an occupancy | e2e | `seats-row-<code>-status`, `devices-row-<assetTag>-owner` |
| AC-11 | AC-11: deletes empty group, returning membersDetached 0 | unit | — |
| AC-11 | AC-11: deleting non-existent group returns NOT_FOUND | unit | — |
| AC-11 | AC-11: a group with no children and no members is deleted after confirmation | e2e | `groups-row-<path>-delete`, `group-delete-dialog`, `group-delete-members`, `group-delete-cancel`, `group-delete-confirm`, `groups-row-<path>` |
| AC-12 | AC-12: delete is refused with HAS_CHILDREN | unit | — |
| AC-12 | AC-12: deleting a group that has child groups is refused | e2e | `groups-row-<path>-delete`, `group-delete-refused-dialog`, `group-delete-refused-children`, `group-delete-refused-dismiss`, `group-delete-confirm` |
| AC-13 | AC-13: deleting Platform detaches its members to groupId null without modifying other member fields | unit | — |
| AC-13 | AC-13: deleting a group that has members detaches them (RUNS LAST) | e2e | `groups-row-Engineering/Platform-delete`, `group-delete-dialog`, `group-delete-members`, `group-delete-confirm`, `members-page`, `members-row-<email>-seats` |

## Refusal cases

- Missing / blank name on create: refused with validation message (`AC-4`).
- Duplicate name under same parent on create: refused with `DUPLICATE_NAME_IN_PARENT` / message (`AC-4a`).
- Duplicate name under same parent on rename: refused with `DUPLICATE_NAME_IN_PARENT` / message (`AC-5a`).
- Move colliding with destination sibling name: refused with `DUPLICATE_NAME_IN_PARENT` / message (`AC-6a`).
- Setting parent to self or descendant (cycle): refused with `ANCESTOR_CYCLE` / message (`AC-8`).
- Deleting a group with child groups: refused with `HAS_CHILDREN` and refusal dialog with no confirm button (`AC-12`).

## Invariant probes

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-12 | `tests/unit/groups.test.ts` ("AC-9: group operations never delete a Member (INV-12)", "AC-13: deleting Platform detaches its members to groupId null without modifying other member fields") | `invariants_touched` is `[]`; AC-9 & AC-13 assert no member deletion occurs during group operations |

## Fixtures

Uses seeded `Engineering` (top level) and `Platform` (child of Engineering with 2 members) from seed/mock store.
All other test entities are created and deleted dynamically within the tests.
AC-13 consumes the seeded `Platform` group and runs last in the suite.

## Out of scope for this plan

- Member assignment / re-assignment to groups (deferred to GRP-02).
- Group-scoped view of members or member list filtering by group.
- Drag-and-drop hierarchy modifications.
- Permission enforcement (deferred to auth ticket per story notes).

## Selector gaps

None. All selectors used are defined in `02-design.md` section 6.
