export function EmptyState({ message, "data-testid": testId }: { message: string; "data-testid"?: string }) {
  return (
    <div data-testid={testId} className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}
