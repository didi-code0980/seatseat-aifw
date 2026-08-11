import type { ReactNode } from "react";

import type { Role } from "@/lib/data";
import { can } from "@/lib/auth/permissions";

/**
 * Renders children only when `role` sits at or above `required`.
 *
 * This hides a control; it does not protect an operation. Every server action still checks
 * permission for itself — a gate that only exists in the markup is a UI affordance, and the request
 * it hides can still be sent by hand. Review check R6 looks for both.
 */
export function PermissionGate({
  role,
  required,
  children,
  fallback = null,
}: {
  role: Role | null | undefined;
  required: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return can(role, required) ? <>{children}</> : <>{fallback}</>;
}
