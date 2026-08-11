import type { Group } from "../types";
import { notWired } from "./client";

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
