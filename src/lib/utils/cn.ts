/** Joins class names, dropping falsy entries. Deliberately tiny — no dependency for this. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
