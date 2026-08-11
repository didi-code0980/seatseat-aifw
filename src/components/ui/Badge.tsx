import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "muted";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink text-white",
  accent: "bg-accent text-white",
  muted: "bg-canvas text-muted border border-border",
};

export function Badge({
  children,
  tone = "neutral",
  "data-testid": testId,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  "data-testid"?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
