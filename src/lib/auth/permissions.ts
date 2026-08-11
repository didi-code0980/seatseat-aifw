// Role ranking and the single `can()` helper.
//
// Ranks are compared, never enumerated at the call site. `rank >= MANAGER` survives a fourth role
// being added between MANAGER and ADMIN; `role === "MANAGER" || role === "ADMIN"` does not, and the
// place it breaks is a permission check, which is the worst place to discover an omission.

import type { Role } from "@/lib/data";

export const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  MANAGER: 1,
  ADMIN: 2,
};

export const ROLES: Role[] = ["USER", "MANAGER", "ADMIN"];

/** True when `role` sits at or above `required` in the ranking. */
export function can(role: Role | null | undefined, required: Role): boolean {
  if (role === null || role === undefined) return false;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/**
 * INV-08: there is no self-signup. Account creation is a Manager-or-above action, and the absence of
 * a signup route is not on its own a control — a route can be added by accident, so the rule is
 * stated here where the check lives.
 */
export function canCreateAccount(role: Role | null | undefined): boolean {
  return can(role, "MANAGER");
}

/** Room, seat, and layout CRUD is Admin-only. */
export function canManageRooms(role: Role | null | undefined): boolean {
  return can(role, "ADMIN");
}

/** Approving seat requests and assigning seats is Manager-or-above. */
export function canApproveRequests(role: Role | null | undefined): boolean {
  return can(role, "MANAGER");
}
