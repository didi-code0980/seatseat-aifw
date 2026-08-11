"use client";

import type { ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  "data-testid"?: string;
}

export function Dialog({ open, title, onClose, children, "data-testid": testId }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div data-testid={testId} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
