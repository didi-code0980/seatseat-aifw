import type {
  AssignMemberToGroupOutcome,
  CreateMemberOutcome,
  DeleteMemberOutcome,
  Member,
  MemberPatch,
  MemberReferences,
  NewMember,
  UpdateMemberOutcome,
} from "../types";
import { notWired } from "./client";

// Every signature here is final and every body throws. `tests/unit/seam-parity.test.ts` holds this
// module to the same exported names and the same arity as `../mock/members.ts`, so each parameter is
// declared and discarded with `void` rather than omitted — an omitted parameter is an arity drift
// the type system will not see and the parity test will.

export async function listMembers(): Promise<Member[]> {
  return notWired("listMembers");
}

export async function getMember(id: string): Promise<Member | null> {
  void id;
  return notWired("getMember");
}

export async function createMember(input: NewMember): Promise<CreateMemberOutcome> {
  void input;
  return notWired("createMember");
}

export async function updateMember(id: string, patch: MemberPatch): Promise<UpdateMemberOutcome> {
  void id;
  void patch;
  return notWired("updateMember");
}

export async function assignMemberToGroup(
  memberId: string,
  groupId: string
): Promise<AssignMemberToGroupOutcome> {
  void memberId;
  void groupId;
  return notWired("assignMemberToGroup");
}

export async function getMemberReferences(id: string): Promise<MemberReferences | null> {
  void id;
  return notWired("getMemberReferences");
}

export async function deleteMember(id: string): Promise<DeleteMemberOutcome> {
  void id;
  return notWired("deleteMember");
}
