"use client";

import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * The create/edit dialog shape every entity CRUD screen reuses.
 *
 * The pattern originates with DEV-01 per the board ordering; this is the empty frame, not an
 * implementation of any ticket. The fields are supplied by the caller because the field names belong
 * to a design contract (RULE-04), not to a shared component.
 */
export function EntityFormDialog({
  open,
  title,
  submitLabel,
  onSubmit,
  onClose,
  children,
  testIdPrefix,
  pending = false,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  children: ReactNode;
  testIdPrefix: string;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} title={title} onClose={onClose} data-testid={`${testIdPrefix}-dialog`}>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} data-testid={`${testIdPrefix}-cancel`}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} data-testid={`${testIdPrefix}-submit`}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
