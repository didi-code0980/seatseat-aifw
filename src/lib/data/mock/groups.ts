import { groups } from "../fixtures";
import type { Group } from "../types";

export async function listGroups(): Promise<Group[]> {
  return structuredClone(groups);
}

export async function getGroup(id: string): Promise<Group | null> {
  return structuredClone(groups.find((g) => g.id === id) ?? null);
}

/** Groups nest. Maximum depth is an open question in the glossary, so nothing here assumes one. */
export async function listChildGroups(parentId: string): Promise<Group[]> {
  return structuredClone(groups.filter((g) => g.parentId === parentId));
}
