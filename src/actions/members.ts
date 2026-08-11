"use server";

// See the note in ./rooms.ts. Member CRUD is MEM-01 and its write contract is set at DESIGN.

import { members } from "@/lib/data";
import type { Member } from "@/lib/data";

export async function getMembers(): Promise<Member[]> {
  return members.listMembers();
}
