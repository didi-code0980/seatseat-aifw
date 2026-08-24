"use server";

// Server actions for members — MEM-01.
//
// Every write action runs the same five steps in the order `coding-standards.md` fixes: "use
// server", parse with the Zod schema named in design section 1.3, check permission, call the seam,
// return a typed result. Step 3 is absent on this ticket by specification rather than by oversight,
// and each action says so at the line where the check belongs. See 02-design.md section 2.
//
// Each parameter is `unknown` and is narrowed by its schema inside the action. A server action is a
// network boundary; typing the parameter as `CreateMemberInput` would claim a guarantee the caller
// never had to honour. On this surface that matters more than on rooms or devices, because this is
// where the role every rank comparison is made against is written.

import { revalidatePath } from "next/cache";

// **The three write actions revalidate two paths, not one** — 02-design.md section 1.4 step 5,
// version 2, finding F-6. Version 1 revalidated `/members` alone, and QA measured the consequence:
// a member created here was absent from `/devices`' owner select until some unrelated device write
// happened to refresh that route — four options where there should have been five. `DEV-01`'s AC-2
// requires that select to list *the members the system holds*, and this surface is what makes a
// member the system holds.
//
// Both paths are named because both render member data and no third does: `grep -rln "members"
// src/app` returns `/members`, `/devices`, and `layout.tsx`, which holds nav labels only.
//
// Enumerating two paths rather than reaching for `revalidatePath("/", "layout")` is deliberate and
// is section 7 alternative G. The broader instrument would also paper over finding F-8 — every
// application route builds as `○ (Static)` and four of them are revalidated by nothing — which is a
// defect a human needs to see rather than one this ticket should hide.
//
// `getMemberReferences` does not revalidate. It writes nothing, and revalidating on a read would
// re-render the page every time a delete button is pressed, including the times it is then cancelled.

import { members } from "@/lib/data";
import type { Member, MemberReferences } from "@/lib/data";
import {
  createMemberSchema,
  memberIdOnlySchema,
  updateMemberSchema,
} from "@/lib/validation/member";

export type MemberFieldName = "fullName" | "email" | "role";

/**
 * `REFERENCED` carries structure and no message string, and that is deliberate. `NOT_FOUND` carries
 * a sentence because there is nothing to say about it but the sentence. INV-12's refusal has two
 * assertable facts inside it — which seats, how many devices — and AC-10 and AC-11 assert them
 * separately. Composing them into prose here would force a caller to parse a sentence for a seat
 * code and an integer; the client composes the sentence and renders each fact in its own element
 * (02-design.md section 6).
 */
export type MemberActionError =
  | { kind: "VALIDATION"; fields: Partial<Record<MemberFieldName, string>> }
  | { kind: "DUPLICATE_EMAIL"; fields: { email: string } }
  | { kind: "REFERENCED"; references: MemberReferences }
  | { kind: "NOT_FOUND"; message: string };

export type MemberActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: MemberActionError };

const DUPLICATE_EMAIL_MESSAGE = "That email address is already in use.";
const MEMBER_GONE_MESSAGE = "That member no longer exists.";

const MEMBER_FIELD_NAMES: readonly string[] = ["fullName", "email", "role"];

function isMemberFieldName(value: PropertyKey | undefined): value is MemberFieldName {
  return typeof value === "string" && MEMBER_FIELD_NAMES.includes(value);
}

/**
 * `VALIDATION.fields` is a map rather than a single field because AC-3 requires a message against
 * *each* offending field, and a one-field error cannot express three blank inputs.
 *
 * The raw `ZodError` never crosses this boundary (coding-standards.md, "Error handling"): it carries
 * the schema's internal shape, and returning it would make the client's rendering depend on Zod's
 * issue format.
 *
 * `updateMemberSchema` and `memberIdOnlySchema` also validate `id`, which is not a `MemberFieldName`
 * and so maps to no entry here. That is deliberate: `id` is never typed by a user, it comes from a
 * rendered row, and the contract's field map covers the fields a form collects.
 */
function fieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[]
): Partial<Record<MemberFieldName, string>> {
  const fields: Partial<Record<MemberFieldName, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    // First message per field wins. A field can raise several issues and the later ones are usually
    // the less specific — which is why `memberEmailSchema` orders `.min(1)` before `.email()`.
    if (isMemberFieldName(key) && fields[key] === undefined) fields[key] = issue.message;
  }
  return fields;
}

function validationError(
  issues: readonly { path: PropertyKey[]; message: string }[]
): { ok: false; error: MemberActionError } {
  return { ok: false, error: { kind: "VALIDATION", fields: fieldErrors(issues) } };
}

function notFound(): { ok: false; error: MemberActionError } {
  return { ok: false, error: { kind: "NOT_FOUND", message: MEMBER_GONE_MESSAGE } };
}

function duplicateEmail(): { ok: false; error: MemberActionError } {
  return {
    ok: false,
    error: { kind: "DUPLICATE_EMAIL", fields: { email: DUPLICATE_EMAIL_MESSAGE } },
  };
}

// The Phase B read action, kept as it was. MEM-01 adds four write actions beside it and changes
// neither its name nor its shape: 02-design.md section 1.2 leaves the two existing seam reads
// untouched, and the design's section 5 describes this file as new, which it is not.
export async function getMembers(): Promise<Member[]> {
  return members.listMembers();
}

/**
 * AC-2, AC-3, AC-4. Three fields reach the seam and none of them is a credential — INV-08 is held by
 * the shape of the contract rather than by a check here (02-design.md section 3.1).
 */
export async function createMember(input: unknown): Promise<MemberActionResult<Member>> {
  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification. MEM-01 enforces no rank check on
  // any member operation: the `AUT — Authentication & Accounts` table in the registry is empty, so
  // no session exists to read a role from. See 01-story.md out-of-scope item 1, which carries the
  // guard to the AUT group, and 02-design.md section 2 for the gate each operation will take.
  //
  // The exposure is sharper here than on rooms or devices and is stated rather than implied: with
  // no gate, anyone who can reach the application can create a member with the ADMIN role, which is
  // the value every `can()` comparison in `rbac-and-security.md` is made against.

  const outcome = await members.createMember(parsed.data);
  // F-1. The refusal is the seam's (`Member.email` is `@unique`); this only names the field it
  // belongs against, so the message renders where the user typed the value.
  if (!outcome.created) return duplicateEmail();

  revalidatePath("/members");
  // F-6: /devices renders the member list too. See the note on the import above.
  revalidatePath("/devices");
  return { ok: true, data: outcome.member };
}

/**
 * AC-5, AC-6, AC-7. One action covers both an attribute change and a role change, because they are
 * the same operation with a different field varied — `MemberPatch` carries all three either way.
 */
export async function updateMember(input: unknown): Promise<MemberActionResult<Member>> {
  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no ownership
  // check, no session. 01-story.md out-of-scope item 1, AUT group. The check belongs on this line,
  // and on the role path it is not only absent but undecided: `Q-3` asks whether a Manager may
  // promote someone to ADMIN — a rank above their own — and `rbac-and-security.md` has no
  // comparison that answers it. That is an ADR for AUT, not a rule this ticket may invent.

  const outcome = await members.updateMember(parsed.data.id, {
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    role: parsed.data.role,
  });

  if (!outcome.updated) {
    if (outcome.reason === "NOT_FOUND") return notFound();
    return duplicateEmail();
  }

  revalidatePath("/members");
  // F-6: /devices renders the member list too. See the note on the import above.
  revalidatePath("/devices");
  return { ok: true, data: outcome.member };
}

/**
 * AC-10, AC-11. A read, and the only action that does not revalidate: it writes nothing, and
 * revalidating here would re-render the page every time a delete button is pressed, including the
 * times the delete is then cancelled.
 *
 * It is what decides which delete dialog opens. It is not what enforces INV-12 — `deleteMember`
 * computes the same two halves itself (02-design.md 1.2, rules 3 and 4).
 */
export async function getMemberReferences(
  input: unknown
): Promise<MemberActionResult<MemberReferences>> {
  const parsed = memberIdOnlySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no session.
  // 01-story.md out-of-scope item 1, AUT group. The check belongs on this line, and this operation
  // needs one of its own — it discloses where a person sits (02-design.md section 2).

  const references = await members.getMemberReferences(parsed.data.id);
  if (references === null) return notFound();

  return { ok: true, data: references };
}

/**
 * AC-8, AC-9, AC-10, AC-11 and INV-12. The refusal is passed through unchanged: both halves reach
 * the client as data, and the sentence naming the seats and the count is composed there.
 */
export async function deleteMember(
  input: unknown
): Promise<MemberActionResult<{ id: string }>> {
  const parsed = memberIdOnlySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // Step 3 — permission check. NOT IMPLEMENTED, by specification: no rank check, no session.
  // 01-story.md out-of-scope item 1, AUT group. The check belongs on this line, and on a
  // permanently destructive operation it is the one that will matter most.

  const outcome = await members.deleteMember(parsed.data.id);
  if (!outcome.deleted) {
    if (outcome.reason === "NOT_FOUND") return notFound();
    return { ok: false, error: { kind: "REFERENCED", references: outcome.references } };
  }

  revalidatePath("/members");
  // F-6: /devices renders the member list too. See the note on the import above.
  revalidatePath("/devices");
  return { ok: true, data: { id: outcome.memberId } };
}
