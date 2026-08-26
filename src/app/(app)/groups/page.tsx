import type { JSX } from "react";

import { GroupsManager } from "./groups-manager";
import { groups } from "@/lib/data";
import type { Group } from "@/lib/data";

/**
 * One rendered row. Pre-order: every group appears immediately after its parent.
 *
 * `parentName` and `childNames` are names rather than ids for ADR-005's reason — a cuid names
 * nothing to a person — and F-7 records that the Phase B scaffold this file replaces rendered the
 * raw `parentId` in its Parent column.
 */
export interface GroupRow {
  group: Group;
  /** 0 for a top-level group. Drives the name cell's indent and nothing else. */
  depth: number;
  /** Ancestor names from the root, joined by "/". The row key — see 02-design.md section 6.1. */
  path: string;
  /** The parent's NAME, or null at the top level. AC-1, AC-3, AC-7. */
  parentName: string | null;
  /** The names of this group's DIRECT children, sorted. Empty when it has none. AC-2, AC-3. */
  childNames: string[];
}

/**
 * A server component that reads through the seam and holds no state.
 *
 * **One seam read, `listGroups()`, flattened into rows here** rather than behind a
 * `listGroupTree()`, because a nested DTO puts a new *shape* across the seam rather than a new
 * name, and shape is the one thing `tests/unit/seam-parity.test.ts` does not check — a mock
 * returning a nested tree the Prisma implementation cannot reproduce passes parity and breaks at
 * the swap (02-design.md section 7, alternative F).
 *
 * **It does not read members, and that is contractual.** Out-of-scope item 2 forbids a group-scoped
 * view of members, so no member fact reaches a row on any render; the count reaches the person
 * through the delete confirmation instead, which is AC-13. A `members.*` import here is a review
 * finding, not an optimisation.
 *
 * **Siblings are ordered by name.** That is not the ordering feature out-of-scope item 7 excludes:
 * nothing is stored, no field is added, and no control reorders anything. It is what makes the
 * rendered tree the same tree on every request, which every criterion that says *the tree is
 * unchanged* needs in order to mean anything.
 */
export default async function GroupsPage(): Promise<JSX.Element> {
  const groupList = await groups.listGroups();

  // Children bucketed by parent. `""` is the top-level bucket, and it is a separate key rather than
  // a null one because a Map keyed by `string | null` reads worse than one extra constant does.
  const TOP_LEVEL = "";
  const childrenByParent = new Map<string, Group[]>();
  for (const group of groupList) {
    const key = group.parentId ?? TOP_LEVEL;
    const bucket = childrenByParent.get(key);
    if (bucket === undefined) childrenByParent.set(key, [group]);
    else bucket.push(group);
  }
  for (const bucket of childrenByParent.values()) bucket.sort((a, b) => a.name.localeCompare(b.name));

  const namesById = new Map(groupList.map((g) => [g.id, g.name]));

  /**
   * Pre-order, depth-first, from the top level down. A group whose `parentId` names no group is
   * never reached, and neither is a group inside a cycle — both are corrupt-store states the seam
   * refuses to create (`PARENT_NOT_FOUND` on both write paths, `ANCESTOR_CYCLE` on the update
   * path), and walking down from the roots cannot loop on either.
   */
  const rows: GroupRow[] = [];
  function walk(parentKey: string, depth: number, prefix: string): void {
    for (const group of childrenByParent.get(parentKey) ?? []) {
      const path = prefix === "" ? group.name : `${prefix}/${group.name}`;
      rows.push({
        group,
        depth,
        path,
        parentName: group.parentId === null ? null : namesById.get(group.parentId) ?? null,
        childNames: (childrenByParent.get(group.id) ?? []).map((c) => c.name),
      });
      walk(group.id, depth + 1, path);
    }
  }
  walk(TOP_LEVEL, 0, "");

  return (
    <section data-testid="groups-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Groups</h1>
      <GroupsManager rows={rows} />
    </section>
  );
}
