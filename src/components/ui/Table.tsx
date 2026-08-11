import type { ReactNode } from "react";

export function Table({ children, "data-testid": testId }: { children: ReactNode; "data-testid"?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table data-testid={testId} className="w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, "data-testid": testId }: { children: ReactNode; "data-testid"?: string }) {
  return (
    <tr data-testid={testId} className="border-b border-border last:border-0">
      {children}
    </tr>
  );
}

export function TH({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

export function TD({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return <td className={`px-4 py-3 ${mono ? "code" : ""}`}>{children}</td>;
}
