import type { Member } from "../types";
import { notWired } from "./client";

export async function listMembers(): Promise<Member[]> {
  return notWired("listMembers");
}

export async function getMember(id: string): Promise<Member | null> {
  void id;
  return notWired("getMember");
}
