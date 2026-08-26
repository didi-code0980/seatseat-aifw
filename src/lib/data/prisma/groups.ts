import type {
  CreateGroupOutcome,
  DeleteGroupOutcome,
  Group,
  GroupPatch,
  GroupReferences,
  NewGroup,
  UpdateGroupOutcome,
} from "../types";
import { notWired } from "./client";

// The Prisma half of the group seam. Every function is a `notWired` body until `prisma/schema.prisma`
// is approved (RULE-09), and every parameter is declared and discarded with `void` — exactly as
// `prisma/members.ts` does it.
//
// The `void` is not decoration. An omitted parameter is an arity drift the type system will not see,
// because a function of fewer parameters is assignable to one of more; `tests/unit/seam-parity.test.ts`
// is what does see it, and `groups` is already in its `PAIRS` list, so it fails on the first drift and
// needs no edit itself.

export async function listGroups(): Promise<Group[]> {
  return notWired("listGroups");
}

export async function getGroup(id: string): Promise<Group | null> {
  void id;
  return notWired("getGroup");
}

export async function listChildGroups(parentId: string): Promise<Group[]> {
  void parentId;
  return notWired("listChildGroups");
}

export async function createGroup(input: NewGroup): Promise<CreateGroupOutcome> {
  void input;
  return notWired("createGroup");
}

export async function updateGroup(id: string, patch: GroupPatch): Promise<UpdateGroupOutcome> {
  void id;
  void patch;
  return notWired("updateGroup");
}

export async function getGroupReferences(id: string): Promise<GroupReferences | null> {
  void id;
  return notWired("getGroupReferences");
}

export async function deleteGroup(id: string): Promise<DeleteGroupOutcome> {
  void id;
  return notWired("deleteGroup");
}
