import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// Black pill, per the visual direction. The pill radius is a token rather than a literal so a change
// to the shape is one edit, not a search across every call site.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:opacity-90",
  secondary: "bg-surface text-ink border border-border hover:bg-canvas",
  danger: "bg-accent text-white hover:bg-accent-hover",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-pill px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}
