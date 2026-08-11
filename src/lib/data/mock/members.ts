import { members } from "../fixtures";
import type { Member } from "../types";

export async function listMembers(): Promise<Member[]> {
  return structuredClone(members);
}

export async function getMember(id: string): Promise<Member | null> {
  return structuredClone(members.find((m) => m.id === id) ?? null);
}
